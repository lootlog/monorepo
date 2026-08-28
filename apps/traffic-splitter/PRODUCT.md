# Traffic splitter context

Read the canonical [`PRODUCT.md`](../../PRODUCT.md) first.

The traffic splitter is edge infrastructure, not a product surface. One route
table serves two independently deployed Workers: `dev.lootlog.pl` forwards to
development Landing, Docs, and Web origins, while `lootlog.pl` forwards to
their production origins. It stores no user data and must not forward cookies
or authorization headers to those static origins.

The Workers remain separate deployables because development changes must not
change production and production approval and rollback remain independent.
The route table and Wrangler configuration in this workspace are the source of
truth; do not edit either deployed Worker in the Cloudflare dashboard.
