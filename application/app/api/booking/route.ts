import { localSafeMode } from '@/lib/local-safety';
export async function POST(request: Request) {
  if (localSafeMode) return Response.json({ code: 'LOCAL_DELIVERY_DISABLED', message: 'Local mode: requests are not saved or sent.' }, { status: 503 });
  let data: unknown;
  try { data = await request.json(); } catch { return Response.json({ message: 'Invalid request.' }, { status: 400 }); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return Response.json({ message: 'Invalid request.' }, { status: 400 });
  const fields = data as Record<string, unknown>;
  if (!['name', 'phone', 'contact'].every(key => typeof fields[key] === 'string' && (fields[key] as string).trim()) || !fields.consent) return Response.json({ message: 'Please fill in all required fields and agree to the privacy policy.' }, { status: 400 });
  return Response.json({ message: 'Online form delivery is not configured yet.' }, { status: 503 });
}
