# Comparateur de taux de change

Compare des devises via deux sources externes (Frankfurter, exchangerate.host)
avec repli automatique en cas de panne, et un cache en mémoire pour limiter
les appels et servir de filet de sécurité.

## Lancer le projet complet avec Docker

```bash
docker compose up --build
```

- Frontend : http://localhost:8080
- API directe : http://localhost:3000 (ex: http://localhost:3000/health)

Le frontend (Nginx) fait proxy des appels `/api/*` vers le backend via le
réseau interne Docker Compose (nom de service `backend`).

## Lancer le backend seul, sans Docker (dev rapide)

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

## Test de charge

Deux scénarios distincts, à ne pas confondre :

**1. Scalabilité (trafic légitime distribué)**

Un test k6 depuis une seule machine simule tout le trafic depuis une seule
IP côté serveur, ce qui déclenche artificiellement le rate-limit anti-abus
(429) avant même de tester la vraie capacité du système. Pour un test
représentatif, monter temporairement la limite :

```bash
RATE_LIMIT_MAX=100000 npm run dev    # ou via docker-compose.yml
k6 run -e BASE_URL=http://localhost:3000 k6/load-test.js
```

Résultat obtenu : p95 = 0.67ms, 0% d'erreurs, 6286 requêtes traitées sur
50 utilisateurs virtuels simulés sur 2 minutes. Cette latence très basse
s'explique par le cache en mémoire (TTL 5 min) qui absorbe l'essentiel du
trafic après les premiers appels aux API externes.

**2. Protection anti-abus (rate-limiting)**

Avec la valeur par défaut (`RATE_LIMIT_MAX=100`), le même test démontre que
le rate-limiter bloque bien le trafic excessif en provenance d'une seule
source (429 attendus et volontaires), comportement de sécurité, pas un bug.

```bash
npm run dev
k6 run -e BASE_URL=http://localhost:3000 k6/load-test.js
```

## Déploiement cloud (Azure Container Apps)

- Frontend : https://TON-URL-FRONTEND-REELLE
- Backend : https://TON-URL-BACKEND-REELLE

### Décisions techniques (déploiement)

- **Azure Container Apps** plutôt qu'AWS App Runner : AWS App Runner a
  fermé l'accès aux nouveaux clients (restriction annoncée en 2026). Azure Container Apps est l'équivalent le plus proche
  (déploiement d'image conteneur géré, scaling automatique, HTTPS
  intégré, sans configuration VPC/ALB manuelle).
- **URL du backend injectée en dur dans le frontend** (`window.__API_BASE__`
  dans `index.html`) plutôt qu'une variable d'environnement au runtime :
  limite assumée du choix Nginx statique.
- **Appel direct navigateur → backend**, sans proxy Nginx intermédiaire :
  le proxy interne (`proxy_pass http://backend:...`) qui fonctionne en
  local via Docker Compose n'a pas de sens sur Azure où chaque service est
  déployé indépendamment sous sa propre URL publique — CORS est activé
  côté backend pour permettre cet appel direct depuis le frontend.
- **Backend et frontend dans le même environnement Container Apps** :
  limite du compte étudiant utilisé (1 seul environnement autorisé par
  abonnement).

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