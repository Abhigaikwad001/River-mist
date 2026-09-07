'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export interface SiteContentBlock {
  id: number;
  key: string;
  title: string;
  subtitle?: string | null;
  content?: string | null;
  image?: string | null;
  category: string;
  active: boolean;
  media?: any;
}

export function useSiteContent(category?: string) {
  const [contentMap, setContentMap] = useState<Record<string, SiteContentBlock>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchContent = async () => {
      try {
        setLoading(true);
        const url = category ? `/content?category=${encodeURIComponent(category)}` : '/content';
        const res = await api.get(url);
        if (isMounted && Array.isArray(res.data)) {
          const map: Record<string, SiteContentBlock> = {};
          res.data.forEach((item: SiteContentBlock) => {
            if (item.key) map[item.key] = item;
          });
          setContentMap(map);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load site content:', err);
          setError(err?.message || 'Failed to load site content');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContent();
    return () => {
      isMounted = false;
    };
  }, [category]);

  const getText = (key: string, fallback: string = ''): string => {
    const item = contentMap[key];
    if (item && item.active) {
      if (item.content && item.content.trim() !== '') return item.content;
      if (item.title && item.title.trim() !== '') return item.title;
    }
    return fallback;
  };

  const getTitle = (key: string, fallback: string = ''): string => {
    const item = contentMap[key];
    if (item && item.active && item.title) return item.title;
    return fallback;
  };

  const getBlock = (key: string): SiteContentBlock | null => {
    return contentMap[key] || null;
  };

  return {
    contentMap,
    loading,
    error,
    getText,
    getTitle,
    getBlock,
  };
}
