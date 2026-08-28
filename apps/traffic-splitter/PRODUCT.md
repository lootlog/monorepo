# Development traffic splitter context

Read the canonical [`PRODUCT.md`](../../PRODUCT.md) first.

The traffic splitter is development infrastructure, not a product surface. It
owns the `dev.lootlog.pl` custom domain and forwards public requests to the
development Landing, Docs, or Web origin. It stores no user data and must not
forward cookies or authorization headers to those static origins.

The Worker exists as an independent deployable because its custom-domain and
cross-origin routing lifecycle is separate from all three frontend artifacts.
Its route table and Wrangler configuration in this workspace are the source of
truth; do not edit the deployed Worker in the Cloudflare dashboard.
