import { makeExecutableSchema } from "@graphql-tools/schema";
import typeDefs from "./schema.graphql"
import { Link, User } from "@prisma/client";
import { GraphQLContext } from "./context";
import { compare, hash } from "bcryptjs";
import { APP_SECRET } from "./auth";
import { sign } from "jsonwebtoken";
import { error } from "console";

const resolvers = {
    Query: {
        info: () => 'This is the API of a HackerNews Clone',
        feed: async (parent: unknown, args: {}, context: GraphQLContext) => {
            return context.prisma.link.findMany();
        },
        me: (parent: unknown, args: {}, context: GraphQLContext) => {
            if (context.currentUser === null) {
                throw new Error("Unauthenticated")
            }
            return context.currentUser;
        },
        links: (parent: User, args: {}, context: GraphQLContext) => {
            context.prisma.user.findUnique({ where: { id: parent.id } }).links()
        }
    },

    Link: {
        id: (parent: Link) => parent.id,
        description: (parent: Link) => parent.description,
        url: (parent: Link) => parent.url,
        postedBy: async (parent: Link, args: {}, context: GraphQLContext) => {
            if (!parent.postedById) {
                return null;
            }

            return context.prisma.link
                .findUnique({ where: { id: parent.id } })
                .postedBy();
        },
    },

    Mutation: {
        signup: async (parent: unknown, args: { email: string, password: string, name: string }, context: GraphQLContext
        ) => {
            const password = await hash(args.password, 10)
            const user = await context.prisma.user.create({
                data: { ...args, password }
            })

            const token = sign({ userId: user.id }, APP_SECRET);

            return {
                token,
                user,
            }
        },

        login: async (parent: unknown, args: { email: string, password: string }, context: GraphQLContext) => {
            const user = await context.prisma.user.findUnique({
                where: { email: args.email },
            })

            if (!user) {
                throw new Error("No such user found")
            }

            const valid = await compare(args.password, user.password);
            if (!valid) {
                throw new Error("Invalid Password")
            }

            const token = sign({ userId: user.id }, APP_SECRET)

            return {
                token,
                user,
            }
        },

        post: (parent: unknown, args: { description: string, url: string }, context: GraphQLContext) => {
            if (context.currentUser === null) {
                throw new Error("Unauthenticated");
            }

            const newLink = context.prisma.link.create({
                data: {
                    url: args.url,
                    description: args.description,
                    postedBy: { connect: { id: context.currentUser.id } }
                },
            });
            return newLink
        }
    }
}

export const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});
