#!/usr/bin/env python3
"""
Kabuten 5.0 — Bloomberg Data Sync Script
=========================================
Runs on OC's local machine (Bloomberg Terminal must be running and logged in).
Connects to Bloomberg Desktop API via blpapi on localhost:8194.
Pulls financial data for all ~230 covered companies.
Upserts into the Neon Postgres bloomberg_data table.

Requirements:
    pip install blpapi psycopg2-binary python-dotenv

Schedule:
    Run daily at 01:30 JST (before APAC sweep window at 02:00 JST).
    Mac (crontab -e):  30 1 * * 1-5 cd /path/to/kabuten5 && python scripts/bloomberg-sync.py
    Windows (Task Scheduler): Configure task for 01:30 JST weekdays

Usage:
    export DATABASE_URL=postgresql://...   # or add to .env.local
    python scripts/bloomberg-sync.py
"""

import os
import sys
import json
import logging
from datetime import datetime, date

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    sys.exit("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")

try:
    import blpapi
except ImportError:
    sys.exit("ERROR: blpapi not installed. Install from https://bloomberg.github.io/blpapi-docs/python/")

# Try loading .env.local
try:
    from dotenv import load_dotenv
    # Look for .env.local in the parent directory (project root)
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    load_dotenv(env_path)
except ImportError:
    pass  # dotenv optional, use system env

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger('bloomberg-sync')

# Bloomberg fields to pull
FIELDS = [
    "PX_LAST",                   # Last price
    "BEST_PE_RATIO",             # Forward P/E
    "BEST_EV_TO_BEST_EBITDA",    # EV/EBITDA (forward)
    "BEST_EPS",                  # Consensus EPS (current FY)
    "BEST_EPS_NXT_YR",           # Consensus EPS (next FY)
    "BEST_SALES",                # Consensus revenue (current FY)
    "BEST_TARGET_PRICE",         # Analyst target price (mean)
    "BEST_TARGET_HI",            # Target price (high)
    "BEST_TARGET_LO",            # Target price (low)
    "TOT_BUY_REC",               # Buy recommendations count
    "TOT_HOLD_REC",              # Hold recommendations count
    "TOT_SELL_REC",              # Sell recommendations count
    "SHORT_INT_RATIO",           # Short interest ratio
    "EXPECTED_REPORT_DATE",      # Next earnings date
    "HIGH_52WEEK",               # 52-week high
    "LOW_52WEEK",                # 52-week low
    "YTD_RETURN",                # YTD return %
    "EQY_DVD_YLD_IND",           # Dividend yield
    "CUR_MKT_CAP",               # Market cap (replaces Yahoo Finance)
]

DB_COLUMN_MAP = {
    "PX_LAST": "px_last",
    "BEST_PE_RATIO": "fwd_pe",
    "BEST_EV_TO_BEST_EBITDA": "ev_ebitda",
    "BEST_EPS": "consensus_eps_fy1",
    "BEST_EPS_NXT_YR": "consensus_eps_fy2",
    "BEST_SALES": "consensus_rev_fy1",
    "BEST_TARGET_PRICE": "target_price_mean",
    "BEST_TARGET_HI": "target_price_high",
    "BEST_TARGET_LO": "target_price_low",
    "TOT_BUY_REC": "buy_count",
    "TOT_HOLD_REC": "hold_count",
    "TOT_SELL_REC": "sell_count",
    "SHORT_INT_RATIO": "short_interest_ratio",
    "EXPECTED_REPORT_DATE": "next_earnings_date",
    "HIGH_52WEEK": "high_52w",
    "LOW_52WEEK": "low_52w",
    "YTD_RETURN": "ytd_return",
    "EQY_DVD_YLD_IND": "dividend_yield",
    "CUR_MKT_CAP": "market_cap",
}


def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        sys.exit("ERROR: DATABASE_URL environment variable not set.")
    return psycopg2.connect(database_url)


def load_companies(conn):
    """Load all companies with bbg_ticker from the database."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT ticker, bbg_ticker, name
            FROM companies
            WHERE bbg_ticker IS NOT NULL AND bbg_ticker != ''
            ORDER BY ticker
        """)
        rows = cur.fetchall()
    log.info(f"Loaded {len(rows)} companies with Bloomberg tickers from DB")
    return rows


def fetch_bloomberg_data(bbg_tickers: list[str]) -> dict:
    """
    Connect to Bloomberg API and pull reference data for all tickers.
    Returns dict: { bbg_ticker: { field: value, ... } }
    """
    session_options = blpapi.SessionOptions()
    session_options.setServerHost("localhost")
    session_options.setServerPort(8194)

    session = blpapi.Session(session_options)
    if not session.start():
        raise RuntimeError("Failed to start Bloomberg session. Is the Terminal running?")

    if not session.openService("//blp/refdata"):
        session.stop()
        raise RuntimeError("Failed to open Bloomberg refdata service.")

    ref_data_service = session.getService("//blp/refdata")
    request = ref_data_service.createRequest("ReferenceDataRequest")

    # Add all tickers
    for ticker in bbg_tickers:
        request.getElement("securities").appendValue(ticker)

    # Add all fields
    for field in FIELDS:
        request.getElement("fields").appendValue(field)

    log.info(f"Sending Bloomberg request for {len(bbg_tickers)} tickers × {len(FIELDS)} fields...")
    session.sendRequest(request)

    results = {}
    while True:
        event = session.nextEvent(timeout=30000)  # 30s timeout

        for msg in event:
            if msg.messageType() == blpapi.Name("ReferenceDataResponse"):
                security_data_array = msg.getElement("securityData")
                for i in range(security_data_array.numValues()):
                    sec_data = security_data_array.getValue(i)
                    ticker_name = sec_data.getElementAsString("security")

                    if sec_data.hasElement("securityError"):
                        log.warning(f"Bloomberg security error for {ticker_name}")
                        continue

                    field_data = sec_data.getElement("fieldData")
                    row = {}
                    for field in FIELDS:
                        if field_data.hasElement(field):
                            elem = field_data.getElement(field)
                            if elem.isNull():
                                row[field] = None
                            else:
                                # Handle date fields
                                if field == "EXPECTED_REPORT_DATE":
                                    try:
                                        d = elem.getValueAsDatetime()
                                        row[field] = date(d.year, d.month, d.day).isoformat()
                                    except Exception:
                                        row[field] = None
                                else:
                                    try:
                                        row[field] = elem.getValueAsFloat()
                                    except Exception:
                                        row[field] = None
                        else:
                            row[field] = None

                    results[ticker_name] = row

        if event.eventType() == blpapi.Event.RESPONSE:
            break

    session.stop()
    log.info(f"Bloomberg data received for {len(results)} tickers")
    return results


def upsert_bloomberg_data(conn, companies: list, bloomberg_results: dict):
    """Upsert bloomberg data into the bloomberg_data table."""
    now = datetime.utcnow().isoformat()
    success_count = 0
    error_count = 0

    with conn.cursor() as cur:
        for company in companies:
            ticker = company['ticker']
            bbg_ticker = company['bbg_ticker']

            if bbg_ticker not in bloomberg_results:
                log.debug(f"No Bloomberg data for {ticker} ({bbg_ticker})")
                continue

            row = bloomberg_results[bbg_ticker]

            # Build upsert values
            values = {
                'ticker': ticker,
                'bbg_ticker': bbg_ticker,
                'updated_at': now,
            }
            for field, col in DB_COLUMN_MAP.items():
                values[col] = row.get(field)

            try:
                cur.execute("""
                    INSERT INTO bloomberg_data (
                        ticker, bbg_ticker, px_last, fwd_pe, ev_ebitda,
                        consensus_eps_fy1, consensus_eps_fy2, consensus_rev_fy1,
                        target_price_mean, target_price_high, target_price_low,
                        buy_count, hold_count, sell_count,
                        short_interest_ratio, next_earnings_date,
                        high_52w, low_52w, ytd_return, dividend_yield,
                        market_cap, updated_at
                    ) VALUES (
                        %(ticker)s, %(bbg_ticker)s, %(px_last)s, %(fwd_pe)s, %(ev_ebitda)s,
                        %(consensus_eps_fy1)s, %(consensus_eps_fy2)s, %(consensus_rev_fy1)s,
                        %(target_price_mean)s, %(target_price_high)s, %(target_price_low)s,
                        %(buy_count)s, %(hold_count)s, %(sell_count)s,
                        %(short_interest_ratio)s, %(next_earnings_date)s,
                        %(high_52w)s, %(low_52w)s, %(ytd_return)s, %(dividend_yield)s,
                        %(market_cap)s, %(updated_at)s
                    )
                    ON CONFLICT (ticker) DO UPDATE SET
                        bbg_ticker = EXCLUDED.bbg_ticker,
                        px_last = EXCLUDED.px_last,
                        fwd_pe = EXCLUDED.fwd_pe,
                        ev_ebitda = EXCLUDED.ev_ebitda,
                        consensus_eps_fy1 = EXCLUDED.consensus_eps_fy1,
                        consensus_eps_fy2 = EXCLUDED.consensus_eps_fy2,
                        consensus_rev_fy1 = EXCLUDED.consensus_rev_fy1,
                        target_price_mean = EXCLUDED.target_price_mean,
                        target_price_high = EXCLUDED.target_price_high,
                        target_price_low = EXCLUDED.target_price_low,
                        buy_count = EXCLUDED.buy_count,
                        hold_count = EXCLUDED.hold_count,
                        sell_count = EXCLUDED.sell_count,
                        short_interest_ratio = EXCLUDED.short_interest_ratio,
                        next_earnings_date = EXCLUDED.next_earnings_date,
                        high_52w = EXCLUDED.high_52w,
                        low_52w = EXCLUDED.low_52w,
                        ytd_return = EXCLUDED.ytd_return,
                        dividend_yield = EXCLUDED.dividend_yield,
                        market_cap = EXCLUDED.market_cap,
                        updated_at = EXCLUDED.updated_at
                """, values)
                success_count += 1
            except Exception as e:
                log.error(f"DB upsert failed for {ticker}: {e}")
                error_count += 1
                conn.rollback()
                continue

    conn.commit()
    return success_count, error_count


def main():
    log.info("=== Kabuten 5.0 Bloomberg Sync ===")
    log.info(f"Started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Connect to DB
    try:
        conn = get_db_connection()
        log.info("Connected to Neon Postgres")
    except Exception as e:
        sys.exit(f"DB connection failed: {e}")

    try:
        # Load companies
        companies = load_companies(conn)
        if not companies:
            log.warning("No companies with bbg_ticker found. Run the seed API first.")
            return

        bbg_tickers = [c['bbg_ticker'] for c in companies]

        # Fetch from Bloomberg
        try:
            bloomberg_results = fetch_bloomberg_data(bbg_tickers)
        except Exception as e:
            sys.exit(f"Bloomberg fetch failed: {e}")

        # Upsert to DB
        success, errors = upsert_bloomberg_data(conn, companies, bloomberg_results)

        log.info(f"=== Sync complete: {success} updated, {errors} errors ===")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
