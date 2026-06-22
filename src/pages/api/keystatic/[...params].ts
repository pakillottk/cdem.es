import type { APIRoute } from 'astro';
import { makeHandler } from '@keystatic/astro/api';
import config from '../../../../keystatic.config';

export const prerender = false;

const handler = makeHandler({ config });

export const ALL: APIRoute = (context) => handler(context);
