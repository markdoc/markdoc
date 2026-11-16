import Link from 'next/link';
import { PageBody } from '../components/Shell/PageBody';

export default function NotFound() {
  return (
    <PageBody>
      <article>
        <h1>Page not found</h1>
        <p>
          <Link href="/docs/getting-started">Explore the documentation</Link>.
        </p>
      </article>
    </PageBody>
  );
}
