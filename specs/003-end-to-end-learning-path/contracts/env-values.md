# Contract: Environment-dependent values table

## Source (`lab/path/env-values.json`)

```json
[
  {
    "name": "ltl.listen.port",
    "kind": "port",
    "labValue": "11752",
    "setIn": ["connectors/sybase-cdc-phoenix.json"],
    "usedBy": ["sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/connect/SybaseCdcConfig.java"],
    "change": "Any free port; it must match the host and port in the ASE interfaces entry CDC_RS."
  }
]
```

## Coverage checked by `path-env.js` (SC-005)
The script builds these sets from the repository and requires every item to appear in the table, and every table entry to refer to something that exists:
| Set | Taken from |
|-----|-----------|
| every configuration key the connector reads | the `ConfigDef` definitions in `SybaseCdcConfig.java` |
| every key of the registered connector configuration | `connectors/sybase-cdc-phoenix.json` |
| every published port and every container port | `lab/env/docker-compose.yml` |
| every environment variable of every service | `lab/env/docker-compose.yml` |
| every host name and container name | `lab/env/docker-compose.yml` |
| the database name, server name and the accounts | `sybase/*.sql`, `lab/env/create-accounts.sh`, `lab/env/_common.sh` |
| the topic prefix and the topic names of the demo | the connector configuration and `lab/path/demo/` |
| the lab paths the scripts read or write | `lab/env/_common.sh`, `lab/env/docker-compose.yml` volumes |

## Rules
- Credentials: the table shows the labelled local test value (for example the public image default of the `sa` login) or the name of the git-ignored file that holds a generated value (`lab/env/.lab-secrets`); the secret scan must pass on the page.
- `usedBy` paths exist; `setIn` paths exist.
- `change` is never empty and says what must change in another environment and what else must change with it (for example the port and the interfaces entry).

## Page (`docs/site/path/env-values.html`)
A searchable table grouped by kind, each row with an anchor (`#ltl-listen-port`) that the `{{env:}}` markers and the Java lessons link to, plus a short "Deploying to another environment" checklist at the top.
