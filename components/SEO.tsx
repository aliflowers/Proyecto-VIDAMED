import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  imageUrl?: string;
  url: string;
}

const SEO: React.FC<SEOProps> = ({ title, description, keywords = [], imageUrl, url }) => {
  const siteName = "Laboratorio Clínico VidaMed";
  const fullTitle = `${title} | ${siteName}`;
  const keywordsString = keywords.join(', ');

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywordsString && <meta name="keywords" content={keywordsString} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
    </Helmet>
  );
};

export default SEO;