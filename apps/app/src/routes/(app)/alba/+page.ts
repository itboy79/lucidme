// Alba — load: in edit mode (?edit=<id>) precarica il sogno da modificare.
// `ssr=false` ovunque, quindi gira solo client-side; il load è asincrono sul DB.
import type { PageLoad } from './$types.js';
import { getDbClient } from '$lib/db/client.svelte.js';

export const load: PageLoad = async ({ url }) => {
  const editId = url.searchParams.get('edit');
  if (!editId) return { editDream: null };
  const { dreamRepo } = await getDbClient();
  const dream = await dreamRepo.getById(editId);
  return { editDream: dream };
};
