import 'graphql-import-node'
import fastify from 'fastify'
import { getGraphQLParameters, processRequest, Request, renderGraphiQL, shouldRenderGraphiQL, sendResult } from "graphql-helix";
import { schema } from "./schema"

async function main() {
    const server = fastify();

    server.route({
        method: ["POST", "GET"],
        url: "/graphql",
        handler: async (req, reply) => {
            const request: Request = {
                headers: req.headers,
                method: req.method,
                query: req.query,
                body: req.body
            };

            if (shouldRenderGraphiQL(request)) {
                reply.header("content-type", "text/html")
                reply.send(
                    renderGraphiQL({
                        endpoint: "/graphql"
                    })
                );
                return
            }

            const {operationName, query, variables} = getGraphQLParameters(request);

            const result = await processRequest({
                request,
                schema,
                operationName,
                query,
                variables,
            });
            sendResult(result, reply.raw)
        }
    })

    server.listen({ port: 3000 }, () => {
        console.log(`GraphQL API is running on http://localhost:3000/`);
    });
}
main()