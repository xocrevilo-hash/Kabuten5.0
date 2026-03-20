#!/usr/bin/env python3
"""
Kabuten 5.0 — Bloomberg Data Sync Script
=========================================
Runs on OC's local machine (Bloomberg Terminal must be running and logged in).
Connects to Bloomberg Desktop API via blpapi on localhost:8194.
Pulls financial data for all ~252 covered companies.
Upserts into the Neon Postgres bloomberg_data table.
Also appends a weekly snapshot row to valuation_history.

Requirements:
    pip install blpapi psycopg2-binary python-dotenv

Schedule:
    Windows Task Scheduler: Monday 08:30 local time (bloomberg-sync.ps1)

Usage:
    set DATABASE_URL=postgresql://...
    python scripts/bloomberg-sync.py
"""

import os
import sys
import logging
from datetime import datetime, date, timezone

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
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    load_dotenv(env_path)
except ImportError:
    pass  # dotenv optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger('bloomberg-sync')

# ── Bloomberg fields ────────────────────────────────────────────────────────
# Original 19 fields
FIELDS_CORE = [
    "PX_LAST",                   # Last price
    "BEST_PE_RATIO",             # Forward P/E
    "BEST_EV_TO_BEST_EBITDA",    # EV/EBITDA (forward)
    "BEST_EPS",                  # Consensus EPS FY1
    "BEST_EPS_NXT_YR",           # Consensus EPS FY2
    "BEST_SALES",                # Consensus revenue FY1 ($M)
    "BEST_TARGET_PRICE",         # Analyst target price (mean)
    "BEST_TARGET_HI",            # Target price (high)
    "BEST_TARGET_LO",            # Target price (low)
    "TOT_BUY_REC",               # Buy recommendations
    "TOT_HOLD_REC",              # Hold recommendations
    "TOT_SELL_REC",              # Sell recommendations
    "SHORT_INT_RATIO",           # Short interest ratio
    "EXPECTED_REPORT_DATE",      # Next earnings date
    "HIGH_52WEEK",               # 52-week high
    "LOW_52WEEK",                # 52-week low
    "YTD_RETURN",                # YTD return %
    "EQY_DVD_YLD_IND",           # Dividend yield
    "CUR_MKT_CAP",               # Market cap ($M)
    "VOLUME_AVG_20D",            # Average daily volume (shares, 20D) — more reliable globally than AVERAGE_VOLUME
]

# Expanded fields — earnings actuals + revision momentum
FIELDS_EXPANDED = [
    # Last reported earnings actuals
    "IS_EPS",                    # Reported EPS (last fiscal year, GAAP)
    "SALES_REV_TURN",            # Reported revenue last FY ($M)
    "EARN_EPS_SURP_PCT",         # EPS surprise % vs consensus
    "EARN_REV_SURP_PCT",         # Revenue surprise % vs consensus
    "EARN_ANN_DT",               # Last earnings announcement date
    # EPS revision momentum (key for Earnings Momentum function)
    "BEST_EPS_1M_REVISION",      # Consensus EPS 1-month change %
    "BEST_EPS_3M_REVISION",      # Consensus EPS 3-month change %
    "BEST_SALES_1M_REVISION",    # Consensus sales 1-month change %
    "BEST_SALES_3M_REVISION",    # Consensus sales 3-month change %
    "BEST_NUM_EST_UP_EPS_1M",    # # analysts revised EPS up last month
    "BEST_NUM_EST_DOWN_EPS_1M",  # # analysts revised EPS down last month
    "BEST_EPS_NTM",              # NTM consensus EPS
    # Guidance
    "IS_EPS_GUIDANCE_HIGH",      # Company EPS guidance high (US names)
    "IS_EPS_GUIDANCE_LOW",       # Company EPS guidance low (US names)
    # Valuation history + consensus detail (v3 additions)
    "PX_TO_BOOK_RATIO",          # Price-to-book ratio (LTM)
    "BEST_MEDIAN_EPS",           # Median consensus EPS FY1
    "BEST_NUM_EST",              # Total number of EPS estimates
    "BEST_EPS_STD_DEV",          # Std deviation of EPS estimates
    # v5 additions
    "CEO_NAME",                  # CEO name (string)
    # v6 additions — consensus high/low + EBIT
    "BEST_EPS_HIGH",             # FY1 EPS high estimate
    "BEST_EPS_LOW",              # FY1 EPS low estimate
    "BEST_SALES_HIGH",           # FY1 Revenue high estimate ($M)
    "BEST_SALES_LOW",            # FY1 Revenue low estimate ($M)
    "BEST_SALES_NXT_YR",         # FY2 Revenue consensus ($M)
    "BEST_EBIT",                 # FY1 EBIT consensus ($M)
    "BEST_EBIT_HIGH",            # FY1 EBIT high estimate ($M)
    "BEST_EBIT_LOW",             # FY1 EBIT low estimate ($M)
    "CRNCY",                     # Trading currency (USD/JPY/EUR/etc.)
    "PRICE_CHANGE_YTD_PCT",      # YTD price change % — fallback for markets where YTD_RETURN is null
]

FIELDS = FIELDS_CORE + FIELDS_EXPANDED

# Date fields that need special parsing
DATE_FIELDS = {"EXPECTED_REPORT_DATE", "EARN_ANN_DT"}

# Integer fields
INT_FIELDS = {"TOT_BUY_REC", "TOT_HOLD_REC", "TOT_SELL_REC",
              "BEST_NUM_EST_UP_EPS_1M", "BEST_NUM_EST_DOWN_EPS_1M"}

# String fields (use getValueAsString instead of getValueAsFloat)
STRING_FIELDS = {"CEO_NAME", "CRNCY"}

DB_COLUMN_MAP = {
    # Core fields
    "PX_LAST":                  "px_last",
    "BEST_PE_RATIO":            "fwd_pe",
    "BEST_EV_TO_BEST_EBITDA":   "ev_ebitda",
    "BEST_EPS":                 "consensus_eps_fy1",
    "BEST_EPS_NXT_YR":          "consensus_eps_fy2",
    "BEST_SALES":               "consensus_rev_fy1",
    "BEST_TARGET_PRICE":        "target_price_mean",
    "BEST_TARGET_HI":           "target_price_high",
    "BEST_TARGET_LO":           "target_price_low",
    "TOT_BUY_REC":              "buy_count",
    "TOT_HOLD_REC":             "hold_count",
    "TOT_SELL_REC":             "sell_count",
    "SHORT_INT_RATIO":          "short_interest_ratio",
    "EXPECTED_REPORT_DATE":     "next_earnings_date",
    "HIGH_52WEEK":              "high_52w",
    "LOW_52WEEK":               "low_52w",
    "YTD_RETURN":               "ytd_return",
    "EQY_DVD_YLD_IND":          "dividend_yield",
    "CUR_MKT_CAP":              "market_cap",
    "VOLUME_AVG_20D":           "avg_volume",
    # Expanded fields
    "IS_EPS":                   "actual_eps_last",
    "SALES_REV_TURN":           "actual_rev_last",
    "EARN_EPS_SURP_PCT":        "eps_surprise_pct",
    "EARN_REV_SURP_PCT":        "rev_surprise_pct",
    "EARN_ANN_DT":              "last_report_date",
    "BEST_EPS_1M_REVISION":     "eps_rev_1m",
    "BEST_EPS_3M_REVISION":     "eps_rev_3m",
    "BEST_SALES_1M_REVISION":   "rev_rev_1m",
    "BEST_SALES_3M_REVISION":   "rev_rev_3m",
    "BEST_NUM_EST_UP_EPS_1M":   "est_up_1m",
    "BEST_NUM_EST_DOWN_EPS_1M": "est_down_1m",
    "BEST_EPS_NTM":             "best_eps_ntm",
    "IS_EPS_GUIDANCE_HIGH":     "guidance_eps_hi",
    "IS_EPS_GUIDANCE_LOW":      "guidance_eps_lo",
    # v3 additions
    "PX_TO_BOOK_RATIO":         "px_to_book",
    "BEST_MEDIAN_EPS":          "median_eps_fy1",
    "BEST_NUM_EST":             "num_estimates",
    "BEST_EPS_STD_DEV":         "eps_std_dev",
    # v5 additions
    "CEO_NAME":                 "ceo_name",
    # v6 additions
    "BEST_EPS_HIGH":            "consensus_eps_fy1_high",
    "BEST_EPS_LOW":             "consensus_eps_fy1_low",
    "BEST_SALES_HIGH":          "consensus_rev_fy1_high",
    "BEST_SALES_LOW":           "consensus_rev_fy1_low",
    "BEST_SALES_NXT_YR":        "consensus_rev_fy2",
    "BEST_EBIT":                "consensus_ebit_fy1",
    "BEST_EBIT_HIGH":           "consensus_ebit_fy1_high",
    "BEST_EBIT_LOW":            "consensus_ebit_fy1_low",
    "CRNCY":                    "crncy",
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


def fetch_bloomberg_data(bbg_tickers: list) -> dict:
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

    for ticker in bbg_tickers:
        request.getElement("securities").appendValue(ticker)
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
                            elif field in DATE_FIELDS:
                                try:
                                    d = elem.getValueAsDatetime()
                                    row[field] = date(d.year, d.month, d.day).isoformat()
                                except Exception:
                                    row[field] = None
                            elif field in INT_FIELDS:
                                try:
                                    row[field] = int(elem.getValueAsFloat())
                                except Exception:
                                    row[field] = None
                            elif field in STRING_FIELDS:
                                try:
                                    v = elem.getValueAsString()
                                    row[field] = v if v else None
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
    now = datetime.now(timezone.utc).isoformat()
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

            values = {'ticker': ticker, 'bbg_ticker': bbg_ticker, 'updated_at': now}
            for field, col in DB_COLUMN_MAP.items():
                values[col] = row.get(field)

            # YTD fallback: PRICE_CHANGE_YTD_PCT is more reliable for Japanese/Asian stocks
            if values.get('ytd_return') is None and row.get('PRICE_CHANGE_YTD_PCT') is not None:
                values['ytd_return'] = row.get('PRICE_CHANGE_YTD_PCT')

            try:
                cur.execute("""
                    INSERT INTO bloomberg_data (
                        ticker, bbg_ticker,
                        px_last, fwd_pe, ev_ebitda,
                        consensus_eps_fy1, consensus_eps_fy2, consensus_rev_fy1,
                        target_price_mean, target_price_high, target_price_low,
                        buy_count, hold_count, sell_count,
                        short_interest_ratio, next_earnings_date,
                        high_52w, low_52w, ytd_return, dividend_yield, market_cap, avg_volume,
                        actual_eps_last, actual_rev_last,
                        eps_surprise_pct, rev_surprise_pct, last_report_date,
                        eps_rev_1m, eps_rev_3m, rev_rev_1m, rev_rev_3m,
                        est_up_1m, est_down_1m, best_eps_ntm,
                        guidance_eps_hi, guidance_eps_lo,
                        px_to_book, median_eps_fy1, num_estimates, eps_std_dev,
                        ceo_name,
                        consensus_eps_fy1_high, consensus_eps_fy1_low,
                        consensus_rev_fy1_high, consensus_rev_fy1_low, consensus_rev_fy2,
                        consensus_ebit_fy1, consensus_ebit_fy1_high, consensus_ebit_fy1_low,
                        crncy,
                        updated_at
                    ) VALUES (
                        %(ticker)s, %(bbg_ticker)s,
                        %(px_last)s, %(fwd_pe)s, %(ev_ebitda)s,
                        %(consensus_eps_fy1)s, %(consensus_eps_fy2)s, %(consensus_rev_fy1)s,
                        %(target_price_mean)s, %(target_price_high)s, %(target_price_low)s,
                        %(buy_count)s, %(hold_count)s, %(sell_count)s,
                        %(short_interest_ratio)s, %(next_earnings_date)s,
                        %(high_52w)s, %(low_52w)s, %(ytd_return)s, %(dividend_yield)s, %(market_cap)s, %(avg_volume)s,
                        %(actual_eps_last)s, %(actual_rev_last)s,
                        %(eps_surprise_pct)s, %(rev_surprise_pct)s, %(last_report_date)s,
                        %(eps_rev_1m)s, %(eps_rev_3m)s, %(rev_rev_1m)s, %(rev_rev_3m)s,
                        %(est_up_1m)s, %(est_down_1m)s, %(best_eps_ntm)s,
                        %(guidance_eps_hi)s, %(guidance_eps_lo)s,
                        %(px_to_book)s, %(median_eps_fy1)s, %(num_estimates)s, %(eps_std_dev)s,
                        %(ceo_name)s,
                        %(consensus_eps_fy1_high)s, %(consensus_eps_fy1_low)s,
                        %(consensus_rev_fy1_high)s, %(consensus_rev_fy1_low)s, %(consensus_rev_fy2)s,
                        %(consensus_ebit_fy1)s, %(consensus_ebit_fy1_high)s, %(consensus_ebit_fy1_low)s,
                        %(crncy)s,
                        %(updated_at)s
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
                        avg_volume = EXCLUDED.avg_volume,
                        actual_eps_last = EXCLUDED.actual_eps_last,
                        actual_rev_last = EXCLUDED.actual_rev_last,
                        eps_surprise_pct = EXCLUDED.eps_surprise_pct,
                        rev_surprise_pct = EXCLUDED.rev_surprise_pct,
                        last_report_date = EXCLUDED.last_report_date,
                        eps_rev_1m = EXCLUDED.eps_rev_1m,
                        eps_rev_3m = EXCLUDED.eps_rev_3m,
                        rev_rev_1m = EXCLUDED.rev_rev_1m,
                        rev_rev_3m = EXCLUDED.rev_rev_3m,
                        est_up_1m = EXCLUDED.est_up_1m,
                        est_down_1m = EXCLUDED.est_down_1m,
                        best_eps_ntm = EXCLUDED.best_eps_ntm,
                        guidance_eps_hi = EXCLUDED.guidance_eps_hi,
                        guidance_eps_lo = EXCLUDED.guidance_eps_lo,
                        px_to_book      = EXCLUDED.px_to_book,
                        median_eps_fy1  = EXCLUDED.median_eps_fy1,
                        num_estimates   = EXCLUDED.num_estimates,
                        eps_std_dev     = EXCLUDED.eps_std_dev,
                        ceo_name             = EXCLUDED.ceo_name,
                        consensus_eps_fy1_high = EXCLUDED.consensus_eps_fy1_high,
                        consensus_eps_fy1_low  = EXCLUDED.consensus_eps_fy1_low,
                        consensus_rev_fy1_high = EXCLUDED.consensus_rev_fy1_high,
                        consensus_rev_fy1_low  = EXCLUDED.consensus_rev_fy1_low,
                        consensus_rev_fy2      = EXCLUDED.consensus_rev_fy2,
                        consensus_ebit_fy1     = EXCLUDED.consensus_ebit_fy1,
                        consensus_ebit_fy1_high = EXCLUDED.consensus_ebit_fy1_high,
                        consensus_ebit_fy1_low  = EXCLUDED.consensus_ebit_fy1_low,
                        crncy                  = EXCLUDED.crncy,
                        updated_at             = EXCLUDED.updated_at
                """, values)
                success_count += 1
            except Exception as e:
                log.error(f"DB upsert failed for {ticker}: {e}")
                error_count += 1
                conn.rollback()
                continue

    conn.commit()
    return success_count, error_count


def upsert_valuation_history(conn, companies: list, bloomberg_results: dict):
    """
    Append today's valuation snapshot to valuation_history.
    Upserts by (ticker, snapshot_date) so re-running same day is safe.
    """
    today = date.today().isoformat()
    inserted = 0

    with conn.cursor() as cur:
        for company in companies:
            ticker = company['ticker']
            bbg_ticker = company['bbg_ticker']

            if bbg_ticker not in bloomberg_results:
                continue

            row = bloomberg_results[bbg_ticker]
            fwd_pe    = row.get("BEST_PE_RATIO")
            ev_ebitda = row.get("BEST_EV_TO_BEST_EBITDA")
            px_last   = row.get("PX_LAST")
            mkt_cap   = row.get("CUR_MKT_CAP")
            px_to_book = row.get("PX_TO_BOOK_RATIO")

            # Skip if no meaningful valuation data
            if fwd_pe is None and ev_ebitda is None:
                continue

            try:
                cur.execute("""
                    INSERT INTO valuation_history
                        (ticker, snapshot_date, fwd_pe, ev_ebitda, px_last, market_cap, px_to_book)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (ticker, snapshot_date) DO UPDATE SET
                        fwd_pe     = EXCLUDED.fwd_pe,
                        ev_ebitda  = EXCLUDED.ev_ebitda,
                        px_last    = EXCLUDED.px_last,
                        market_cap = EXCLUDED.market_cap,
                        px_to_book = EXCLUDED.px_to_book
                """, (ticker, today, fwd_pe, ev_ebitda, px_last, mkt_cap, px_to_book))
                inserted += 1
            except Exception as e:
                log.error(f"Valuation history insert failed for {ticker}: {e}")
                conn.rollback()
                continue

    conn.commit()
    log.info(f"Valuation history: {inserted} snapshots written for {today}")
    return inserted


def main():
    log.info("=== Kabuten 5.0 Bloomberg Sync ===")
    log.info(f"Started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info(f"Fields: {len(FIELDS_CORE)} core + {len(FIELDS_EXPANDED)} expanded = {len(FIELDS)} total (v7)")

    try:
        conn = get_db_connection()
        log.info("Connected to Neon Postgres")
    except Exception as e:
        sys.exit(f"DB connection failed: {e}")

    try:
        companies = load_companies(conn)
        if not companies:
            log.warning("No companies with bbg_ticker found. Run the seed API first.")
            return

        bbg_tickers = [c['bbg_ticker'] for c in companies]

        try:
            bloomberg_results = fetch_bloomberg_data(bbg_tickers)
        except Exception as e:
            sys.exit(f"Bloomberg fetch failed: {e}")

        # Upsert main bloomberg_data table
        success, errors = upsert_bloomberg_data(conn, companies, bloomberg_results)
        log.info(f"bloomberg_data: {success} updated, {errors} errors")

        # Append valuation history snapshot
        upsert_valuation_history(conn, companies, bloomberg_results)

        log.info(f"=== Sync complete: {success} companies updated ===")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
