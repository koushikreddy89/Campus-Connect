/**
 * Alumni Individual Profile Page
 * Shows detailed profile of a specific alumni with their posts
 */

import React from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import AlumniProfile from '@/components/alumni/AlumniProfilePage';

export const AlumniProfilePage: React.FC = () => {
  const { alumniId } = useParams<{ alumniId: string }>();

  if (!alumniId) {
    return <div>Alumni not found</div>;
  }

  return (
    <>
      <Helmet>
        <title>Alumni Profile - Campus Connect</title>
        <meta name="description" content="View alumni profile and posts" />
      </Helmet>

      <AlumniProfile alumniId={alumniId} />
    </>
  );
};

export default AlumniProfilePage;
