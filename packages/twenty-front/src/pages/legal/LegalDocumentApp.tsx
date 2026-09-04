import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

import { LazyRoute } from '@/app/components/LazyRoute';
import { SharedAppProviders } from '@/app/components/SharedAppProviders';
import { LEGAL_DOCUMENTS } from '~/pages/legal/legal-document-config';

const LegalDocumentPage = lazy(() =>
  import('~/pages/legal/LegalDocumentPage').then((module) => ({
    default: module.LegalDocumentPage,
  })),
);

export const LegalDocumentApp = () => (
  <BrowserRouter>
    <SharedAppProviders>
      <Routes>
        <Route
          path={AppPath.LegalIndex}
          element={<Navigate to={AppPath.LegalTerms} replace />}
        />
        {LEGAL_DOCUMENTS.map(({ key, route }) => (
          <Route
            key={key}
            path={route}
            element={
              <LazyRoute fallback={null}>
                <LegalDocumentPage documentKey={key} />
              </LazyRoute>
            }
          />
        ))}
      </Routes>
    </SharedAppProviders>
  </BrowserRouter>
);
