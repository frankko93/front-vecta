# Vecta Mining - Frontend

Sistema de gestión y visualización de datos mineros con reportes financieros.

## 🎯 Descripción

Sistema que permite:
- **Gestionar empresas mineras** y sus configuraciones
- **Importar datos** desde CSVs (producción, costos, ingresos, etc)
- **Generar reportes automáticos** con cálculos financieros
- **Comparar datos reales vs presupuestos** (múltiples versiones)
- **Tomar decisiones** basadas en métricas calculadas

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 18+ 
- npm o pnpm
- Backend API corriendo en `http://localhost:3080` (ver documentación del backend)

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Actualizar .env.local con tu configuración
# NEXT_PUBLIC_API_URL=http://localhost:3080

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
src/
├── app/                          # Next.js App Router
│   ├── (main)/
│   │   ├── auth/
│   │   │   └── login/           # Página de login
│   │   └── dashboard/
│   │       ├── companies/       # Gestión de empresas
│   │       ├── import/          # Importación de datos CSV
│   │       ├── reports/         # Reportes y análisis
│   │       └── users/           # Gestión de usuarios
│   ├── globals.css
│   └── layout.tsx
├── components/                   # Componentes reutilizables
│   ├── ui/                      # Componentes base (shadcn/ui)
│   └── data-table/              # Componentes de tablas
├── lib/
│   └── api/                     # Cliente API y servicios
│       ├── client.ts            # Axios client configurado
│       ├── types.ts             # Tipos TypeScript
│       └── services/            # Servicios por módulo
│           ├── auth.service.ts
│           ├── companies.service.ts
│           ├── config.service.ts
│           ├── data.service.ts
│           ├── reports.service.ts
│           └── user.service.ts
├── hooks/                       # Custom React hooks
│   ├── use-auth.ts
│   ├── use-companies.ts
│   ├── use-config.ts
│   ├── use-data-import.ts
│   ├── use-reports.ts
│   └── use-users.ts
├── navigation/                  # Configuración de navegación
│   └── sidebar/
│       └── sidebar-items.ts
└── config/                      # Configuración de la app
    ├── env.ts
    └── app-config.ts
```

## 🔐 Autenticación

El sistema usa autenticación con **Bearer Token**:

1. Login con DNI y contraseña
2. Token se guarda en `localStorage`
3. Todas las peticiones incluyen el header: `Authorization: Bearer {token}`
4. Token expira en 6 horas

**Usuario de prueba:**
- DNI: `99999999`
- Password: `admin123`

## 📊 Módulos Principales

### 1. Empresas (`/dashboard/companies`)
- Listar empresas mineras
- Crear nuevas empresas (admin)
- Ver detalles (minerales, configuración)
- Editar y eliminar (admin)

### 2. Importar Datos (`/dashboard/import`)
- Importar archivos CSV
- Tipos soportados:
  - **PBR**: Plan Beneficio Regional (minería, procesamiento)
  - **Dore**: Producción de doré, precios
  - **OPEX**: Costos operativos
  - **CAPEX**: Gastos de capital
  - **Financial**: Datos financieros
- Seleccionar tipo: Actual vs Budget
- Versiones de budget (v1, v2, v3...)
- Validación de errores por fila/columna
- Historial de importaciones

### 3. Reportes (`/dashboard/reports`)
- **Summary Report** principal
- Filtros:
  - Empresa
  - Año
  - Meses específicos o todos
  - Versión de budget a comparar
- Visualización:
  - Resumen por mes
  - Comparación Actual vs Budget
  - Varianzas y porcentajes
  - Métricas calculadas automáticamente
- Secciones:
  - Minería (mineral, estéril, desarrollos)
  - Procesamiento (toneladas, leyes, recuperación)
  - Producción (oz plata/oro)
  - Costos (mina, procesamiento, G&A)
  - NSR (Net Smelter Return)
  - CAPEX
  - Cash Cost & AISC

### 4. Usuarios (`/dashboard/users`)
- Listar usuarios del sistema
- Permisos: admin, editor, viewer
- CRUD completo (admin only)

## 🎨 Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui + Radix UI
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios
- **State**: TanStack Query (React Query)
- **TypeScript**: Full type safety

## 📝 Convenciones de Código

- **Idioma**: Comentarios en inglés, UI en español
- **TypeScript**: Strict mode habilitado
- **Linter**: Biome (ESLint + Prettier)
- **Naming**: 
  - Componentes: PascalCase
  - Hooks: camelCase con prefijo `use`
  - Services: camelCase con sufijo `.service.ts`

## 🔄 Flujo de Trabajo Típico

1. **Login** → Obtener token
2. **Seleccionar/crear empresa** → Ver lista y seleccionar
3. **Importar Budget anual** (12 meses):
   - PBR, Dore, OPEX, CAPEX, Financial
   - Tipo: budget, versión 1
4. **Importar Actual mensual** (cada mes que cierra):
   - Mismo proceso con tipo: actual
5. **Ver Reportes**:
   - Seleccionar empresa, año, meses
   - Comparar Actual vs Budget
   - Analizar varianzas

## 🛠️ Scripts Disponibles

   ```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Ejecutar producción
npm run start

# Linting
npm run lint

# Formateo
npm run format

# Check completo (lint + format)
npm run check

# Auto-fix
npm run check:fix
```

## 🐛 Debugging

- Errores de API se logean en consola en development
- Token inválido/expirado → redirect automático a login
- Errores de importación muestran fila y columna específica
- Estado de datos (`has_data`) indica qué información falta

## 🔒 Permisos

- **viewer**: Solo ver empresas, minerales, reportes
- **editor**: Ver + importar datos
- **admin**: Todo (crear empresas, eliminar datos, gestionar usuarios)

## 📈 Próximas Funcionalidades

- [ ] Gráficos interactivos (Charts)
- [ ] Exportar reportes a Excel/PDF
- [ ] Dashboard con KPIs principales
- [ ] Notificaciones de datos faltantes
- [ ] Filtros avanzados en reportes
- [ ] Comparación multi-versión de budgets
- [ ] YTD (Year To Date) calculations
- [ ] Gestión de minerales por empresa
- [ ] Audit log de cambios

## 🤝 Contribución

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guías de contribución.

## 📄 Licencia

Ver [LICENSE](./LICENSE) para más información.

## 📞 Soporte

- **Backend API**: `http://localhost:3080`
- **Frontend**: `http://localhost:3000`
- **Health Check**: `http://localhost:3080/api/health/readiness`

---

**Versión**: 2.1.0  
**Última actualización**: Enero 2025
