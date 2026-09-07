# CLAUDE.md — Contexto del proyecto

@AGENTS.md

Este archivo es la memoria del proyecto para cualquier sesión de Claude Code.
El documento completo de análisis y arquitectura está en `docs/ARQUITECTURA.md`. Léelo antes de proponer o escribir código.

## Resumen del proyecto

Asistente Nutricional Inteligente: una app web (PWA) que, a partir del objetivo del usuario (bajar de peso, ganar músculo, mantener, etc.), su inventario de alimentos en casa y su presupuesto semanal, genera un plan de comidas y una lista de compras. El diferencial es partir de lo que el usuario ya tiene y de cuánto puede gastar, algo que apps como MyFitnessPal o Mealime no hacen.

Principio rector: **la IA no calcula, no decide restricciones y no inventa datos nutricionales. La IA elige, adapta, redacta y conversa.** Todo lo que sea número, seguridad o dinero es código determinista y con pruebas (calorías/macros, filtro de alergias, cálculo nutricional de recetas, costos, comparación plan vs. inventario).

## Decisiones ya tomadas (Parte 6 del documento)

1. **Tres entidades, no dos**: Alimento (genérico) ← Producto (SKU con marca) ← Inventario (lo del usuario).
2. **Recetas curadas, no generadas libremente por IA** en el MVP (banco de 60–80 recetas con ingredientes estructurados).
3. **Una persona por MVP** (no hogar), pero el campo `personas_hogar` se crea desde ya en la base de datos.
4. **Unidad base: gramos y mililitros**, siempre, en todo el sistema.
5. **Piso de seguridad nutricional: pendiente.** Se define explícitamente en la Etapa 4 (Motor Nutricional), como número fijo en código, sin excepciones. No avanzar la Etapa 4 sin haber fijado este número.
6. **Métrica de éxito del MVP**: % de usuarios de la beta que generan un segundo plan semanal la semana siguiente.

Otras decisiones ya cerradas en el documento (no reabrir sin razón fuerte):
- MVP solo Chile (campos `pais` y `moneda` quedan en la base de datos para el futuro, sin construir nada multipaís).
- Orden de funciones: buscar alimento → describir alimento → escanear código de barras (no al revés).
- Stack: Next.js 14+ (TypeScript) + Tailwind/shadcn + Supabase (Postgres/Auth) + Vercel + API de Claude (Sonnet) + Zod + Vitest + @zxing/browser + Open Food Facts + Sentry + PostHog.
- No scraping de supermercados en el MVP.

## Etapa actual

**Etapa 0 — Preparación.**
Objetivo: cuentas creadas (GitHub, Supabase, Vercel, consola de Anthropic), editor instalado, proyecto Next.js vacío desplegado.
Se considera terminada cuando hay una página propia visible en una URL pública.

Historial de etapas completadas: ninguna todavía.

## Regla de oro: no avanzar de etapa sin cerrar la anterior

No se empieza una etapa nueva hasta que la etapa anterior esté:
1. **Probada** — abierta en el navegador, usada como lo haría un usuario real, intentando romperla.
2. **Guardada en Git** — con commit (y de preferencia en su propia rama) antes de pasar a la siguiente etapa.

Si algo falla a mitad de una etapa, se corrige esa etapa antes de seguir. No se combinan varias etapas en una sola sesión, aunque parezca más rápido.

## Cómo trabajar en este proyecto (usuario no programador)

- Una etapa = una conversación. Nunca "hazme la app completa".
- Pedir el plan de archivos antes del código, y explicaciones en lenguaje simple de qué hace cada archivo.
- Probar manualmente después de cada etapa.
- Entregar el error completo cuando algo falle, no "no funciona".
- Usar una rama por etapa.
- Desconfiar de atajos que junten varias etapas.
