import { z } from 'zod';
import { supabase } from './supabase';

/** As RPCs públicas devolvem JSON livre: validamos com Zod antes de usar. */
const marcaSchema = z.object({
  nome: z.string(),
  logo_url: z.string().nullable(),
  cor_destaque: z.string(),
});
export type Marca = z.infer<typeof marcaSchema>;

export async function obterMarca(): Promise<Marca> {
  const { data, error } = await supabase.rpc('obter_marca');
  if (error) throw new Error(error.message);
  return marcaSchema.parse(data);
}
