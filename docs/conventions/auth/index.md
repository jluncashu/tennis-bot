# Auth conventions

* [Token strategy](token-strategy.md) - where each token lives, how long it lasts, and how it's transported
* [Cookie options](cookie-options.md) - the shared cookie configuration for the refresh token

The `auth` module follows the standard [module pattern](/module-pattern/)
but does not own an entity — see the "does not own an entity" case in
[Schema](/module-pattern/schema.md).
