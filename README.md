# Comparateur de taux de change

Compare des devises via deux sources externes (Frankfurter, exchangerate.host)
avec repli automatique en cas de panne, et un cache en mémoire pour limiter
les appels et servir de filet de sécurité.

## Lancer le backend en local

```bash
cd backend
npm install
npm run dev      # démarre sur http://localhost:3000
```

## Tests

```bash
cd backend
npm test
```

Les appels réseau externes sont mockés dans les tests (`global.fetch` est
remplacé) : les tests sont donc rapides, déterministes et ne dépendent pas
de la disponibilité des API tierces.

## Endpoints disponibles

- `GET /health` — vérification de l'état du service
- `GET /convert?from=EUR&to=USD&amount=100` — conversion de devises
- `GET /metrics` — compteurs d'usage (requêtes, erreurs, source des taux)

## Décisions techniques

- **Backend Express + TypeScript** : montée en route rapide, typage fort,
  écosystème mature pour les tests dans un temps limité.
- **Cache en mémoire (`Map` + TTL)** plutôt que Redis : réduit les appels
  externes et sert de repli en cas de panne, sans dépendance supplémentaire
  à opérer. Limite assumée : non partagé entre plusieurs instances du
  backend (voir "Known limitations" plus bas, section à compléter).
- **`/metrics` en JSON simple** plutôt que le format Prometheus : aucun
  serveur Prometheus n'est déployé pour scraper l'endpoint dans le cadre de
  cet exercice.