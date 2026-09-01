# @lootlog/access-policy

Application-owned authorization decisions for Lootlog capabilities.

Construct a policy once at a trusted adapter and pass the policy into decision-making code:

```ts
const accessPolicy = createAccessPolicy({ capabilities: permissionDto });

if (accessPolicy.allows(Capability.LOOTLOG_EVENTS_WRITE)) {
  // Authorized application behavior.
}
```

`OWNER` grants every capability. `ADMIN` grants every capability except `OWNER`, preserving the distinct recovery authority.

Raw capability arrays belong only at persistence and deployed transport boundaries. Use `getEffectiveCapabilities` when an existing adapter must serialize the effective grants; application callers should use `allows` or `allowsAny`.
