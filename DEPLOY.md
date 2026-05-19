# Deploy: Vercel + Neon (gratis)

## 1. Base de datos — Neon (PostgreSQL gratis en la nube)

1. Ve a **https://neon.tech** → Sign Up con tu cuenta de GitHub o Google
2. Crea un nuevo proyecto → ponle "gorditas-db"
3. En el dashboard verás el **Connection string**, algo como:
   ```
   postgresql://josej:xxxxxxxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Guarda ese string, lo necesitarás en el siguiente paso

### Migrar tu base de datos a Neon

Una vez que tengas el `DATABASE_URL`, ejecuta las migraciones y seeds localmente
apuntando a Neon (temporal, solo para poblar la BD):

```bash
# En .env, cambia la línea DATABASE_URL (o agrega):
DATABASE_URL=postgresql://josej:xxx@host/neondb?sslmode=require

npm run migrate
npm run seed
npm run migrate:users
npm run seed:users
npm run migrate:promos
npm run seed:promos
npm run migrate:orden-fix
```

---

## 2. Backend — Vercel

### Prerequisitos
```bash
npm install -g vercel
```

### Primer deploy
```bash
cd gordita-backend
vercel login        # te abre el navegador
vercel              # sigue las instrucciones (framework: Other, root: .)
```

### Variables de entorno en Vercel

En **https://vercel.com → tu proyecto → Settings → Environment Variables**,
agrega estas variables (para Production, Preview y Development):

| Variable       | Valor                                      |
|----------------|--------------------------------------------|
| `DATABASE_URL` | tu connection string de Neon               |
| `JWT_SECRET`   | una clave larga y segura (mín 32 chars)    |
| `JWT_EXPIRES_IN` | `8h`                                     |
| `NODE_ENV`     | `production`                               |

> ⚠️ **NUNCA** pongas las variables directamente en el código ni en vercel.json

### Deploy a producción
```bash
vercel --prod
```

Vercel te dará una URL como: `https://gordita-backend-xxx.vercel.app`

---

## 3. Notas importantes para producción

- **Cold starts**: Vercel serverless puede tardar ~1-2 seg en la primera petición
  del día. En producción real se puede mejorar con un ping periódico.
- **Neon gratis**: 512MB storage, sin límite de conexiones (serverless driver).
  Más que suficiente para el negocio.
- **JWT_SECRET**: genera uno seguro con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## 4. Para desarrollo local (sin cambios)

```bash
npm run dev   # sigue funcionando igual con tu PostgreSQL local
```

Solo asegúrate de que tu `.env` tenga las variables de desarrollo
(sin DATABASE_URL, o con la variable de Neon si quieres probar contra la BD cloud).
