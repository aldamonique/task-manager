import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@/server/trpc/root";

import { createTRPCContext } from "@/server/trpc/init";

export const runtime = "nodejs";

const handler = (request: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",

    req: request,

    router: appRouter,

    createContext: createTRPCContext,

    onError({ error, path }) {
      // Expected client and validation errors are already represented by tRPC.
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("Unexpected tRPC error", {
          path,
          cause: error.cause,
        });
      }
    },
  });
};

// The same endpoint handles queries over GET and mutations over POST.
export { handler as GET, handler as POST };
