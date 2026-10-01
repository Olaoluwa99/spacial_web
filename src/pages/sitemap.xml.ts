import type { APIRoute } from 'astro';
import { styles } from '../data/styles';
export const GET: APIRoute = ({ site }) => {
  if (!site) return new Response('Set SITE_URL to generate the production sitemap.', { headers: { 'Content-Type': 'text/plain' } });
  const paths = ['/', '/styles/', '/guide/', '/playground/', ...styles.map(s => `/styles/${s.id}/`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${new URL(p, site).href}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
