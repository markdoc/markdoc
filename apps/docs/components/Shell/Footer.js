import React from 'react';

import { AppLink as Link } from '../AppLink';
import { ThemeToggle } from '.';

export function Footer({ children: links, landing }) {
  const copyright = (
    <Link href="https://stripe.com">
      <svg
        title="Built by Stripe"
        width="99"
        height="28"
        viewBox="0 0 99 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.98432 20H6.27432C8.44932 20 9.81432 18.905 9.81432 17.03C9.81432 15.665 9.00432 14.72 7.78932 14.39C8.61432 14.105 9.45432 13.415 9.45432 12.035C9.45432 10.235 8.23932 9.23 5.95932 9.23H1.98432V20ZM3.37932 13.85V10.445H5.83932C7.27932 10.445 8.07432 11 8.07432 12.155C8.07432 13.295 7.27932 13.85 5.83932 13.85H3.37932ZM3.37932 15.08H6.21432C7.65432 15.08 8.43432 15.83 8.43432 16.925C8.43432 18.035 7.65432 18.785 6.21432 18.785H3.37932V15.08ZM18.0294 12.155H16.6794V16.88C16.6794 18.185 15.6894 18.92 14.7144 18.92C13.5594 18.92 13.0794 18.17 13.0794 17.06V12.155H11.7294V17.345C11.7294 19.01 12.6744 20.165 14.3544 20.165C15.4644 20.165 16.2294 19.58 16.6794 18.92V20H18.0294V12.155ZM20.5112 10.79H21.9812V9.23H20.5112V10.79ZM21.9212 12.155H20.5712V20H21.9212V12.155ZM25.8247 9.23H24.4747V20H25.8247V9.23ZM28.5882 18.125C28.5882 19.625 29.3532 20.075 30.6882 20.075C31.1382 20.075 31.5282 20.03 31.8732 19.955V18.8C31.5582 18.875 31.3332 18.89 31.0182 18.89C30.3282 18.89 29.9232 18.74 29.9232 17.915V13.31H31.7082V12.155H29.9232V9.86H28.5882V12.155H27.3732V13.31H28.5882V18.125ZM41.0199 20.165C43.1949 20.165 44.4399 18.305 44.4399 16.085C44.4399 13.85 43.1949 12.005 41.0199 12.005C39.9249 12.005 39.0549 12.53 38.5899 13.295V9.23H37.2399V20H38.5899V18.86C39.0549 19.64 39.9249 20.165 41.0199 20.165ZM38.5599 15.815C38.5599 13.985 39.6699 13.19 40.7799 13.19C42.2499 13.19 43.0749 14.39 43.0749 16.085C43.0749 17.765 42.2499 18.98 40.7799 18.98C39.6699 18.98 38.5599 18.17 38.5599 16.37V15.815ZM49.1804 20.855L52.5554 12.155H51.1454L48.9704 18.155L46.7654 12.155H45.3404L48.2504 19.715L47.8754 20.645C47.5604 21.425 47.2454 21.635 46.6604 21.635C46.4354 21.635 46.2704 21.62 46.0154 21.56V22.73C46.2554 22.775 46.4204 22.79 46.7504 22.79C48.1154 22.79 48.7304 22.04 49.1804 20.855Z"
          fill="var(--dark)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M98.7993 15.7837C98.7993 12.8784 97.3871 10.5861 94.688 10.5861C91.9774 10.5861 90.3374 12.8784 90.3374 15.761C90.3374 19.1768 92.2735 20.9018 95.0524 20.9018C96.4077 20.9018 97.4327 20.5954 98.2071 20.1642V17.8945C97.4327 18.2803 96.5443 18.5186 95.4168 18.5186C94.3121 18.5186 93.3327 18.1328 93.2074 16.7937H98.7766C98.7766 16.6461 98.7993 16.056 98.7993 15.7837ZM93.1732 14.7056C93.1732 13.4232 93.9591 12.8898 94.6766 12.8898C95.3713 12.8898 96.1116 13.4232 96.1116 14.7056H93.1732Z"
          fill="var(--stripe)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M85.9413 10.5861C84.8251 10.5861 84.1076 11.1081 83.709 11.4712L83.561 10.7676H81.0554V23.9999L83.9026 23.3985L83.914 20.1869C84.324 20.4819 84.9276 20.9018 85.9299 20.9018C87.9685 20.9018 89.8249 19.2676 89.8249 15.6702C89.8135 12.3791 87.9343 10.5861 85.9413 10.5861ZM85.2579 18.4052C84.586 18.4052 84.1874 18.1668 83.914 17.8718L83.9026 13.6615C84.1988 13.3324 84.6088 13.1054 85.2579 13.1054C86.2943 13.1054 87.0118 14.263 87.0118 15.7496C87.0118 17.2703 86.3057 18.4052 85.2579 18.4052Z"
          fill="var(--stripe)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M77.1377 9.91656L79.9963 9.30374V7L77.1377 7.60147V9.91656Z"
          fill="var(--stripe)"
        />
        <path
          d="M79.9963 10.7791H77.1377V20.709H79.9963V10.7791Z"
          fill="var(--stripe)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M74.074 11.6188L73.8918 10.779H71.4318V20.709H74.279V13.9793C74.9509 13.1055 76.0898 13.2644 76.4429 13.3892V10.779C76.0784 10.6429 74.7459 10.3932 74.074 11.6188Z"
          fill="var(--stripe)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M68.3796 8.31641L65.6007 8.90653L65.5894 17.9966C65.5894 19.6762 66.8535 20.9132 68.5391 20.9132C69.473 20.9132 70.1563 20.743 70.5321 20.5387V18.235C70.1677 18.3825 68.3682 18.9045 68.3682 17.225V13.1962H70.5321V10.779H68.3682L68.3796 8.31641Z"
          fill="var(--stripe)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M60.6807 13.6615C60.6807 13.2189 61.0452 13.0487 61.6488 13.0487C62.5143 13.0487 63.6076 13.3097 64.4732 13.775V11.1081C63.5279 10.7336 62.594 10.5861 61.6488 10.5861C59.3368 10.5861 57.7993 11.789 57.7993 13.7977C57.7993 16.9299 62.1271 16.4305 62.1271 17.781C62.1271 18.303 61.6715 18.4732 61.0338 18.4732C60.0885 18.4732 58.8813 18.0874 57.9246 17.5654V20.2663C58.9838 20.7202 60.0543 20.9132 61.0338 20.9132C63.4026 20.9132 65.0313 19.7443 65.0313 17.7129C65.0199 14.3311 60.6807 14.9325 60.6807 13.6615Z"
          fill="var(--stripe)"
        />
      </svg>
    </Link>
  );

  const disclaimer = (
    <span className="disclaimer">
      This site was{' '}
      <a href="" className="live-edit">
        built using Markdoc
      </a>
      <style jsx>
        {`
          .disclaimer {
            color: rgba(24, 24, 27, 0.5);
            padding-left: 2rem;
            font-size: 15px;
            font-weight: 400;
            line-height: 27px;
          }

          .disclaimer button {
            display: inline-block;
            padding: 0;
            color: inherit;
            text-decoration: underline;
            font-weight: regular;
          }

          :global(body.dark) .disclaimer {
            color: var(--white);
          }

          @media screen and (max-width: 1000px) {
            .disclaimer {
              display: none;
            }
          }
        `}
      </style>
    </span>
  );

  const toggle = <ThemeToggle />;

  const fancyLinks = landing ? (
    <>
      <h3 className="jumbo">
        {React.Children.toArray(links).map((l, i, a) => (
          <span className="main-link" key={i}>
            {l}
            {i !== a.length - 1 ? ', ' : ''}
          </span>
        ))}
        <span className="try-link">
          <Link href="/sandbox">Try Markdoc</Link>
        </span>
      </h3>
      <hr />
      <style jsx>
        {`
          h3 {
            margin: 0;
            display: flex;
            flex-wrap: wrap;
          }

          h3 :global(.main-link:nth-child(n + 2)) {
            margin-left: 10px;
            display: inline-block;
            min-height: 0px;
          }

          h3 :global(.main-link a) {
            text-decoration: none;
          }

          hr {
            margin: 2rem auto;
            display: block;
            width: 100%;
            border: none;
            border-bottom: 1px solid var(--page-border);
          }

          .try-link {
            margin-left: auto;
          }

          @media screen and (max-width: 1000px) {
            h3 {
              font-size: 35px;
              line-height: 46px;
            }
          }

          @media screen and (max-width: 780px) {
            .try-link {
              display: none;
            }
          }

          @media screen and (max-width: 600px) {
            hr {
              margin: 0 auto;
            }
            h3 {
              font-size: 24px;
              line-height: 33px;
              text-align: center;
              flex-wrap: wrap;
              justify-content: center;
              padding: 0 2rem;
            }
          }
        `}
      </style>
    </>
  ) : null;

  return (
    <>
      <footer className="desktop">
        {fancyLinks}
        <div className="flex">
          <div className="left gap">{copyright}</div>
          <div className="right gap">
            {disclaimer}
            {toggle}
          </div>
        </div>
      </footer>
      <footer className="mobile gap">
        {fancyLinks}
        {copyright}
        {toggle}
        {disclaimer}
      </footer>
      <style jsx>
        {`
          :global(.gap) {
            display: flex;
            align-items: center;
            gap: 1.5rem;
          }

          footer {
            position: relative;
            display: flex;
            z-index: 100;
            width: 100%;
            color: var(--dark);
            padding: 1rem 0;
          }

          footer.desktop {
            flex-direction: column;
          }

          footer.mobile {
            display: none;
            flex-direction: column;
            padding: 0;
          }

          .right {
            margin-left: auto;
          }

          @media screen and (max-width: 600px) {
            footer.mobile {
              display: flex;
            }
            footer.desktop {
              display: none;
            }
          }
        `}
      </style>
    </>
  );
}
