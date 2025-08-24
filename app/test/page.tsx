export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>YUANDI ERP - Test Page</h1>
      <p>서버가 정상적으로 실행되고 있습니다.</p>
      <p>환경: {process.env.NODE_ENV}</p>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
    </div>
  );
}