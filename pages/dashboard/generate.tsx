import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useEffect } from 'react';
import { createServerSideHelpers } from '@trpc/react-query/server';
import { appRouter } from '../../server/routers/_app';
import { createContext } from '../../server/trpc';
import { CopyPasteWorkflowComponent } from '../../components/workflow/CopyPasteWorkflowComponent';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function GeneratePage() {
  return (
    <>
      <Head>
        <title>AI Response Generator - FreelanceFlow</title>
        <meta
          name="description"
          content="Generate professional responses to client messages using AI"
        />
      </Head>

      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <CopyPasteWorkflowComponent />
        </div>
      </ProtectedRoute>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // This ensures the page is protected and user data is available
  // The actual authentication is handled by ProtectedRoute component
  return {
    props: {},
  };
};