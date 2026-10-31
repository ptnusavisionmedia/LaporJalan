// Tipe minimal runtime Deno (Supabase Edge Functions) agar editor tidak menandai `Deno` merah.
// Hanya untuk editor; tidak ikut di-deploy.
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
};
