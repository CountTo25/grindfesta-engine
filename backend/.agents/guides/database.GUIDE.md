Migrations are done via sqlx. Whenever you need to migrate

```
sqlx migrate add -r <YOUR_MIGRATION_NAME>
```

Writing any code that requires queries should be done via sqlx. Instead of inlining code, use include_str! macro and place your query files into /backend/sql/[query_name].sql to avoid bloating rust code with raw sql