interface CompanyPageProps {
  params: Promise<{ ticker: string }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { ticker } = await params;
  return (
    <div className="p-8">
      <h1 className="font-mono text-2xl">Company: {ticker}</h1>
    </div>
  );
}
