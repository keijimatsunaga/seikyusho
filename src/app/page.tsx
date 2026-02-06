import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Seikyusho MVP</h1>
      <p>デプロイ確認用トップページです。</p>
      <ul>
        <li>
          <Link href="/admin/invoices">/admin/invoices</Link>
        </li>
      </ul>
    </main>
  );
}
