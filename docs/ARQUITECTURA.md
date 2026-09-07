# Asistente Nutricional Inteligente — Análisis de Producto y Arquitectura del MVP

Documento de trabajo. Versión 1. Sin código.
Guárdalo en el repositorio como `docs/ARQUITECTURA.md`: será el contexto que le pases a Claude en cada sesión de desarrollo.

---

## PARTE 1 — DIAGNÓSTICO DEL DOCUMENTO ACTUAL

### 1.1 Lo que está bien planteado

- **El diferencial es real.** "Objetivo + inventario + presupuesto → plan + lista de compras" no lo hace bien casi nadie. MyFitnessPal cuenta calorías, Mealime planifica menús, ninguno parte de lo que ya tienes en casa ni de cuánto puedes gastar.
- **La regla "usar primero lo que ya tienes"** es el corazón del producto y está bien identificada como tal.
- **La separación producto ≠ inventario de usuario** (sección 17) es correcta y mucha gente la equivoca.
- **"La IA no debe inventar datos nutricionales"** es la decisión técnica más importante del documento y está bien tomada.
- **Desarrollo modular por etapas** (sección 33) es exactamente la forma de trabajar con un asistente de IA sin programar.

### 1.2 Contradicciones detectadas

**C1 — El presupuesto necesita precios, pero los precios están dos etapas después.**
La Etapa 5 promete "costo estimado $31.500" y "te quedan $8.500", pero los precios de supermercado llegan en la Etapa 6. Sin una fuente de precios, la Etapa 5 no puede existir.
→ *Solución:* crear una tabla de **precios de referencia** (precio promedio por kilo/litro de cada alimento genérico, cargada a mano, ~150 alimentos). Da un costo estimado con ±15% de error, que es suficiente para el MVP. Los precios por supermercado la reemplazan después sin cambiar nada del resto del sistema.

**C2 — El inventario habla en "unidades", el plan habla en "gramos".**
El escáner registra "Leche Colun 1 L × 2 unidades". El menú necesita "200 ml de leche". Y "4 plátanos" no es una cantidad nutricional: es ~480 g de pulpa. Sin una capa de conversión, comparar plan contra inventario es imposible y toda la sección 21 (lista de compras) falla.
→ *Solución:* todo se almacena internamente en **unidad base (g o ml)**. Cada producto guarda su contenido neto; cada alimento guarda porciones típicas ("unidad mediana = 120 g") y densidad cuando aplica.

**C3 — Faltan los alimentos genéricos como entidad.**
El documento tiene "productos" (con código de barras y marca) y "inventario". Pero el plan alimenticio y las recetas razonan sobre **ingredientes genéricos**: "pollo", "arroz", "yogurt". Sin esa tercera entidad, no puedes saber que "Arroz Tucapel Grado 1 1kg" y "Arroz Miraflores 1kg" sirven para la misma receta, ni generar una lista de compras que diga "1 kg de arroz".
→ *Solución:* tres entidades, no dos: **Alimento** (genérico, canónico) ← **Producto** (SKU con marca y código de barras) ← **Inventario** (lo que tiene cada usuario). Es el cambio estructural más importante de este análisis.

**C4 — "La IA no inventa datos" vs. "la IA genera recetas".**
Si Claude escribe una receta nueva, ¿de dónde salen sus calorías? Si las estima, violaste tu propia regla.
→ *Solución:* la IA propone **ingredientes y gramos**; el backend calcula los macros sumando desde la tabla de alimentos. Si un ingrediente no existe en la base, se rechaza la receta. La IA nunca emite un número nutricional.

**C5 — País abierto, supermercados y pesos chilenos cerrados.**
Se pide país en el registro, pero el presupuesto está en CLP y los supermercados son chilenos.
→ *Solución:* MVP solo Chile. Deja los campos `pais` y `moneda` en la base de datos para no rehacer después, pero no construyas nada multipaís.

**C6 — El orden de la Etapa 3 empieza por lo más difícil.**
Escanear código de barras es la función más vistosa y la de peor retorno inicial: la cobertura de productos chilenos en las bases abiertas es irregular, y si el usuario escanea tres productos y ninguno aparece, abandona.
→ *Solución:* orden inverso — buscar alimento → describir alimento → escanear.

### 1.3 Vacíos importantes (funcionalidades que faltan)

**V1 — El ciclo nunca se cierra.** Generas un plan y una lista de compras, pero nada actualiza el inventario. Si el usuario cocina el almuerzo del lunes, sus 200 g de pollo deberían descontarse. Sin esto, en tres días el inventario es ficción y la propuesta de valor completa se cae.
→ Necesitas: marcar comida como *consumida / omitida / reemplazada*, y descuento automático de inventario con registro de movimientos.

**V2 — ¿Para cuántas personas se cocina?** Un presupuesto de $40.000 semanales es holgado para una persona e imposible para cuatro. La lista de compras y las porciones cambian por completo. No está preguntado en ninguna parte.
→ Agregar `personas_en_el_hogar` y `porciones_por_comida` al perfil.

**V3 — No hay entidad "receta".** El plan dice "Pollo + arroz + verduras", pero preguntas cuánto tiempo tiene el usuario para cocinar. Sin recetas con tiempo de preparación e instrucciones, esa pregunta no sirve para nada.

**V4 — No hay seguimiento de peso ni recálculo.** El dashboard muestra "peso 75 kg" como dato congelado del registro. Un objetivo a 3 meses necesita re-medición y ajuste de calorías. Falta un historial de peso y un recálculo automático.

**V5 — No hay forma de rechazar o cambiar una comida.** "No quiero comer huevos el miércoles" es la interacción más frecuente en este tipo de app. Necesitas regeneración parcial (una comida, un día), no solo regeneración completa.

**V6 — Sobras y cocina por lotes.** Si el usuario tiene 15 minutos para cocinar, la solución real es cocinar el domingo para tres días. Es también la palanca más fuerte de presupuesto. Debería ser una función del generador de planes, no un accidente.

**V7 — Onboarding de 13 pantallas antes de ver valor.** Es la principal causa de abandono en apps de nutrición. El usuario da 40 datos y no ha visto nada a cambio.
→ *Recomendación de producto:* onboarding en dos bloques. Bloque 1 (perfil, objetivo, actividad, restricciones — 5 pantallas) → **mostrar inmediatamente calorías objetivo y un día de menú de ejemplo**. Bloque 2 (inventario, presupuesto, supermercados) se pide después, dentro de la app, cuando ya hay motivación.

**V8 — Costo de IA por usuario.** Si cada plan semanal se genera desde cero con un modelo grande, y ofreces plan gratuito, el costo variable puede superar el ingreso. Falta: límites de generación, caché de recetas, y un registro de llamadas y costos.

**V9 — Sin métricas ni definición de éxito.** ¿Qué significa que el MVP funcionó? Propuesta: % de usuarios que completan onboarding, % que genera un segundo plan a la semana siguiente (la métrica que realmente importa), % de listas de compras marcadas como compradas.

**V10 — Falta el vencimiento de precios y la caducidad de los datos.** Un precio de hace 4 meses no sirve. Cada precio necesita fecha y una regla de "obsoleto después de X días".

**V11 — Estados vacíos y errores.** Inventario vacío, producto no encontrado, IA caída, sin conexión. Son la mitad de la experiencia real y no están diseñados.

### 1.4 Riesgos, ordenados por gravedad

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **Alergias.** Recomendar un alérgeno puede provocar daño grave | Crítico | El filtro de alérgenos **nunca** puede depender de la IA. Debe ser un filtro determinista en base de datos, aplicado antes y después de la generación, sobre ingredientes de receta y sobre lista de ingredientes de producto. Doble validación obligatoria. Además: advertir sobre trazas y sobre productos sin lista de ingredientes verificada |
| R2 | **Objetivos peligrosos.** "Bajar 10 kg en 1 mes" | Crítico | Reglas duras en código, no sugerencias: máximo 0,5–1 % del peso corporal por semana; piso absoluto de calorías; si el plazo es inseguro, la app **propone un plazo alternativo y no genera el plan extremo**. Bloquear objetivos de pérdida de peso si el IMC es bajo. Prohibir el registro a menores de 18. Preguntar por embarazo/lactancia y derivar a profesional |
| R3 | **Trastornos de la conducta alimentaria.** Este tipo de app puede reforzar conductas restrictivas | Alto | No mostrar rachas de déficit, no premiar comer menos, no permitir metas por debajo de umbrales seguros, incluir mensajes de derivación profesional. Decidirlo desde el diseño, no después |
| R4 | **Legal / sanitario.** En Chile la prescripción dietética es un acto profesional del nutricionista | Alto | Posicionar como herramienta educativa y de planificación de compras, no como tratamiento. Términos y condiciones y disclaimers revisados por un abogado antes del lanzamiento público |
| R5 | **Datos de salud = datos sensibles.** Peso, alergias, objetivos corporales | Alto | Ley 19.628 y la nueva Ley 21.719 de protección de datos personales (confirma con un abogado su vigencia y obligaciones aplicables). Mínimo: cifrado en tránsito y reposo, aislamiento por usuario en la base de datos, exportación y borrado de cuenta, política de privacidad real |
| R6 | **Scraping de supermercados.** Ya lo identificaste | Medio-alto | No scrapear en el MVP. Alternativa elegante: **las boletas del propio usuario son una fuente de precios legítima**, con fecha, local y precio real. Es tu foso competitivo a largo plazo y evita el problema legal completo |
| R7 | **Calidad de la base de productos chilenos** | Medio | Base propia alimentada por: catálogo abierto + carga manual de los ~300 productos más comunes + aportes de usuarios marcados como "no verificados" |
| R8 | **Alcance excesivo.** 9 etapas, 5 tipos de escaneo, comparador de supermercados | Medio | El MVP termina en la Etapa 5 de tu lista. Todo lo demás es visión, no plan |
| R9 | **Desarrollar sin saber programar** | Medio | Es viable, pero exige disciplina de etapas cortas, control de versiones y pruebas. Ver Parte 5 |

---

## PARTE 2 — ARQUITECTURA TÉCNICA DEL MVP

### 2.1 Principio rector

> **La IA no calcula, no decide restricciones y no inventa datos. La IA elige, adapta, redacta y conversa.**

Todo lo que sea número, seguridad o dinero es código determinista y comprobable:

| Componente | Quién lo hace |
|---|---|
| Calorías y macros objetivo | Código (fórmula Mifflin-St Jeor + factor de actividad) |
| Filtro de alergias e intolerancias | Código (consulta en base de datos) |
| Cálculo nutricional de una receta | Código (suma de ingredientes) |
| Comparación plan vs. inventario | Código |
| Costo estimado y lista de compras | Código |
| Selección y combinación de recetas | IA (dentro de un conjunto ya filtrado) |
| Interpretar "tengo medio kilo de pechuga" | IA (solo interpreta; los datos salen de la base) |
| Explicaciones, variaciones, tono | IA |

### 2.2 Diagrama lógico

```
Navegador (Next.js, PWA)
        │
        ▼
API en el servidor (Next.js Route Handlers)
        │
        ├──► Motor Nutricional        (TypeScript puro, con pruebas)
        ├──► Motor de Planificación   (determinista + llamada a IA)
        ├──► Motor de Compras         (diff inventario/plan + precios)
        │
        ├──► Supabase (PostgreSQL + Auth + Storage)
        └──► API de Claude (parsing, selección de recetas, texto)
```

**Regla de oro:** la clave de la API de IA vive únicamente en el servidor. Nunca en el navegador.

### 2.3 Decisión clave: banco de recetas curado, no generación libre

Para el MVP, crea un **banco de 60–80 recetas** con ingredientes estructurados (alimento + gramos), tiempo de preparación y etiquetas (vegana, sin lactosa, tipo de comida). El generador de planes:

1. Filtra el banco por restricciones, tipo de alimentación, tiempo de cocina y disgustos → **filtro determinista**.
2. Puntúa cada receta según cuánto usa del inventario actual → **determinista**.
3. Le entrega a Claude las 25–30 mejores candidatas y le pide que arme una semana variada y equilibrada → **IA**.
4. Ajusta las porciones para cuadrar con las calorías objetivo → **determinista**.
5. Valida: ¿ningún alérgeno? ¿macros dentro de ±10 %? Si falla, reintenta o corrige. → **determinista**.

Esto reduce a la vez el riesgo de alergias, el costo de IA, la latencia y las alucinaciones. La generación libre de recetas llega en la fase 2, y siempre validada contra la tabla de alimentos.

### 2.4 Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | **Next.js 14+ (App Router) + TypeScript** | Es lo que Claude escribe mejor; un solo lenguaje para front y back |
| Estilos | **Tailwind CSS + shadcn/ui** | Componentes listos y accesibles; evita diseñar desde cero |
| Base de datos y auth | **Supabase (PostgreSQL)** | Auth, base de datos, permisos por fila y almacenamiento en un solo servicio. Confirmas tu elección |
| Hosting | **Vercel** | Despliegue automático desde GitHub. Correcto |
| IA | **API de Claude (Sonnet)** para producción | Mejor seguimiento de instrucciones y salida estructurada, que es exactamente lo que necesitas. Deja la capa de IA detrás de una interfaz propia para poder cambiar de proveedor sin tocar el resto |
| Validación de datos | **Zod** | Verifica que la respuesta de la IA tenga la forma esperada antes de guardarla. Innegociable |
| Escáner | **@zxing/browser** en PWA | Funciona con la cámara del navegador; evita app nativa en el MVP |
| Datos de productos | **Open Food Facts** + catálogo propio | Gratis y abierto; cobertura chilena parcial, por eso el catálogo propio |
| Errores | **Sentry** | Sin esto, "no funciona" es todo lo que sabrás |
| Analítica | **PostHog** | Para medir abandono en el onboarding |
| Pruebas | **Vitest** | Solo para el motor nutricional y los filtros de alergia. Ahí sí son obligatorias |

**Móvil:** no hagas app nativa. Haz la web una **PWA instalable**. La cámara funciona, se instala desde el navegador, y te ahorras las tiendas de aplicaciones. Nativo solo cuando el producto esté validado.

---

## PARTE 3 — ESTRUCTURA DE LA BASE DE DATOS

Nombres en español para que te resulten legibles. Todas las tablas de usuario con seguridad por fila activada (cada usuario solo ve lo suyo). Las tablas de catálogo son de lectura pública y solo se escriben desde el servidor.

### Bloque A — Usuario

**`perfiles`** — `id` (= usuario autenticado), `nombre`, `fecha_nacimiento`, `sexo`, `altura_cm`, `pais`, `comuna`, `personas_hogar`, `moneda`, `creado_en`
*Nota: guarda fecha de nacimiento, no edad. La edad envejece sola.*

**`registros_peso`** — `id`, `usuario_id`, `peso_kg`, `fecha`
*El peso nunca vive en el perfil. Es una serie temporal. Resuelve V4.*

**`objetivos`** — `id`, `usuario_id`, `tipo` (perder_grasa | ganar_musculo | mantener | recomposicion | mejorar_alimentacion | otro), `objetivo_libre`, `peso_objetivo_kg`, `plazo_semanas`, `fecha_inicio`, `activo`, y el snapshot calculado: `kcal_objetivo`, `proteina_g`, `carbos_g`, `grasas_g`, `calculado_en`, `ajustado_por_seguridad` (booleano)

**`actividad`** — `usuario_id`, `realiza_actividad`, `dias_semana`, `tipos` (lista), `factor_actividad`

**`preferencias`** — `usuario_id`, `tipo_alimentacion`, `comidas_por_dia`, `minutos_cocina`, `presupuesto_semanal`, `acepta_sobras`

**`restricciones`** — `id`, `usuario_id`, `tipo` (alergia | intolerancia | gusta | no_gusta), `alimento_id` (opcional), `etiqueta_libre`, `severidad`
*Una sola tabla para las cuatro cosas de las secciones 8–10. Menos código, misma expresividad.*

**`supermercados_usuario`** — `usuario_id`, `supermercado_id`

### Bloque B — Catálogo (compartido por todos)

**`alimentos`** — el genérico. `id`, `nombre_canonico` ("pechuga de pollo"), `sinonimos` (lista), `categoria`, `unidad_base` (g | ml), `kcal_100`, `proteina_100`, `carbos_100`, `grasa_100`, `fibra_100`, `densidad_g_ml`, `alergenos` (lista), `apto_vegano`, `apto_vegetariano`, `fuente`

**`porciones_alimento`** — `alimento_id`, `nombre` ("unidad mediana", "taza"), `gramos`
*Resuelve "4 plátanos" → 480 g. Imprescindible (C2).*

**`productos`** — el SKU con marca. `id`, `codigo_barras` (único, opcional), `nombre`, `marca`, `alimento_id` → alimentos, `contenido_neto`, `unidad`, macros por 100, `ingredientes_texto`, `alergenos`, `fuente` (off | manual | usuario), `verificado`

**`supermercados`** — `id`, `nombre`

**`precios_referencia`** — `alimento_id`, `precio_por_100g`, `vigente_desde`
*La tabla que hace posible la Etapa de presupuesto sin supermercados (resuelve C1).*

**`precios`** — `id`, `producto_id` o `alimento_id`, `supermercado_id`, `precio`, `comuna`, `fecha`, `fuente` (manual | boleta | usuario)
*Se crea vacía en el MVP y se llena en la fase 2.*

### Bloque C — Inventario

**`inventario`** — `id`, `usuario_id`, `producto_id` (opcional), `alimento_id` (obligatorio), `cantidad_original`, `unidad_original`, **`cantidad_base_g`**, `fecha_agregado`, `fecha_vencimiento` (opcional), `estado`
*`alimento_id` siempre presente, aunque venga de un escaneo: es lo que permite comparar con el plan.*

**`movimientos_inventario`** — `id`, `inventario_id`, `delta_g`, `motivo` (alta | consumo | compra | ajuste | merma), `referencia_comida_id`, `creado_en`
*Cierra el ciclo (V1) y te da historial y posibilidad de deshacer.*

### Bloque D — Recetas y plan

**`recetas`** — `id`, `nombre`, `tipos_comida` (lista), `minutos`, `porciones_base`, `instrucciones`, `etiquetas`, `origen` (curada | ia | usuario), `activa`

**`receta_ingredientes`** — `receta_id`, `alimento_id`, `gramos`, `opcional`, `sustitutos` (lista de alimento_id)

**`planes`** — `id`, `usuario_id`, `semana_inicio`, `estado` (borrador | activo | cerrado), snapshots de `kcal_objetivo` y `presupuesto`, `costo_estimado`, `generado_en`
*Los snapshots son clave: un plan de hace un mes debe mostrarse con los objetivos de entonces.*

**`plan_comidas`** — `id`, `plan_id`, `dia`, `tipo_comida`, `receta_id`, `porciones`, macros calculados, `estado` (planificada | consumida | omitida | reemplazada)

**`listas_compra`** — `id`, `plan_id`, `estado`, `costo_estimado`

**`items_lista`** — `id`, `lista_id`, `alimento_id`, `cantidad_necesaria_g`, `cantidad_en_inventario_g`, `cantidad_a_comprar_g`, `producto_sugerido_id`, `precio_estimado`, `comprado`
*Guardar las tres cantidades permite explicar al usuario por qué compra eso, que es justo tu diferencial.*

### Bloque E — Operación

**`llamadas_ia`** — `id`, `usuario_id`, `tipo`, `modelo`, `tokens_entrada`, `tokens_salida`, `costo_estimado`, `ms`, `exito`
*Sin esto no sabes cuánto te cuesta cada usuario (V8).*

---

## PARTE 4 — DESARROLLO EN ETAPAS PEQUEÑAS

Cada etapa es **una conversación con Claude**, termina en algo que puedes ver funcionando, y no empieza hasta que la anterior esté probada y guardada en Git. Los tiempos suponen trabajo de tardes, sin experiencia previa.

| # | Etapa | Terminada cuando... | ~Tiempo |
|---|---|---|---|
| **0** | **Preparación.** Cuentas (GitHub, Supabase, Vercel, consola de Anthropic), editor instalado, proyecto vacío desplegado | Ves una página tuya en una URL pública | 1–2 días |
| **1** | **Registro y sesión.** Correo y contraseña, cerrar sesión, recuperar contraseña | Puedes crear una cuenta y entrar | 2–3 días |
| **2** | **Perfil y objetivo.** Pantallas 3–6 del documento, guardadas en base de datos | Recargas la página y tus datos siguen ahí | 3–4 días |
| **3** | **Restricciones y preferencias.** Alergias, intolerancias, gustos, rutina, presupuesto | Onboarding completo de punta a punta | 3–4 días |
| **4** | **Motor nutricional.** Sin interfaz: solo la función que calcula calorías y macros, con **pruebas automáticas** y **reglas de seguridad** (R2) | 15 casos de prueba pasan, incluyendo objetivos peligrosos que la app rechaza | 2–3 días |
| **5** | **Dashboard v0.** Muestra objetivo, peso, calorías y macros. Registro de peso | Ves tus números al entrar | 2 días |
| **6** | **Catálogo de alimentos.** Cargar ~250 alimentos genéricos con macros y porciones típicas + buscador | Escribes "pollo" y aparecen resultados razonables | 3–5 días |
| **7** | **Inventario manual.** Buscar alimento → cantidad → conversión a gramos → guardar. Editar y eliminar | Agregas "1 kg de arroz" y lo ves en tu lista | 3–4 días |
| **8** | **Inventario por descripción.** *Primera integración con Claude.* La IA solo interpreta el texto y propone coincidencias del catálogo; el usuario confirma | "tengo medio kilo de pechuga" se convierte en 500 g de pechuga de pollo | 3–4 días |
| **9** | **Banco de recetas.** 60–80 recetas con ingredientes estructurados, tiempo y etiquetas. Cálculo automático de macros | Abres una receta y ves sus macros calculados, no escritos a mano | 5–7 días |
| **10** | **Generador de plan semanal.** Filtro por restricciones → puntuación por inventario → selección con IA → ajuste de porciones → validación | Obtienes 7 días de menú que respetan tus alergias y tus calorías | 7–10 días |
| **11** | **Lista de compras.** Diferencia entre lo que pide el plan y lo que hay en inventario | La lista no incluye lo que ya tienes | 3–4 días |
| **12** | **Presupuesto.** Precios de referencia + costo estimado + mensaje de sobre/bajo presupuesto + una estrategia simple de abaratamiento | "Dentro de tu presupuesto, te quedan $8.500" | 4–5 días |
| **13** | **Cerrar el ciclo.** Marcar comida como consumida → descuenta inventario. Cambiar una comida. Marcar lista como comprada → recarga inventario | Cocinas el lunes y el inventario baja solo | 4–5 días |
| **14** | **Código de barras.** Escáner + Open Food Facts + flujo de "producto no encontrado" | Escaneas una leche y se agrega en tres toques | 4–6 días |
| **15** | **Endurecer.** Estados vacíos, errores, límites de uso de IA, analítica, política de privacidad, disclaimers | Se lo puedes dar a 10 desconocidos sin vergüenza | 5–7 días |
| **16** | **Beta con 10–20 personas reales.** No construir nada nuevo: solo observar y corregir | Sabes si alguien genera un segundo plan la semana siguiente | 2–3 semanas |

**Aquí termina el MVP.** Todo lo demás (supermercados, boletas, foto del refrigerador, vencimientos, versión premium, app nativa) se decide **después** de la beta, con datos reales. Si en la beta nadie genera un segundo plan, ninguna de esas funciones te habría salvado.

**Total estimado:** 3–5 meses de trabajo constante a tiempo parcial. Si alguien te promete menos, no ha contado el tiempo de depurar.

### Costos mensuales del MVP

Supabase gratis (o ~US$25 al crecer), Vercel gratis (o ~US$20), Claude API por uso (con selección de recetas en vez de generación libre, son centavos por plan), dominio ~US$12 al año. **Puedes empezar prácticamente en cero.**

---

## PARTE 5 — HERRAMIENTAS: QUÉ ES CADA UNA Y PARA QUÉ SIRVE

| Herramienta | Qué es, en simple | Para qué la necesitas |
|---|---|---|
| **Node.js** | El motor que ejecuta JavaScript en tu computador | Sin él nada arranca. Se instala una vez |
| **VS Code** (o Cursor) | El editor donde viven los archivos | Ver, editar y ejecutar el proyecto |
| **Claude Code** | Claude trabajando directamente sobre tus archivos desde la terminal o el escritorio | Es lo que convierte "no sé programar" en viable. Lee tu proyecto completo, edita varios archivos y ejecuta comandos |
| **Git** | Historial de cambios de tu código | Poder volver atrás cuando algo se rompa. Y algo se romperá |
| **GitHub** | Donde vive ese historial en internet | Respaldo, y conexión automática con Vercel |
| **Next.js** | El marco de trabajo de la aplicación | Páginas, navegación y servidor en un solo proyecto |
| **TypeScript** | JavaScript que avisa de errores antes de ejecutar | Te ahorra una clase entera de fallos que tú no detectarías |
| **Tailwind + shadcn/ui** | Estilos y componentes listos (botones, formularios, diálogos) | Que la app se vea bien sin ser diseñador |
| **Supabase** | Base de datos + usuarios + archivos, administrable desde el navegador | Guardar todo. Tiene un panel visual: puedes ver tus tablas sin escribir consultas |
| **Vercel** | Publica la app en internet | Cada vez que subes cambios a GitHub, la web se actualiza sola |
| **API de Claude** | Claude dentro de tu aplicación, para tus usuarios | Interpretar alimentos, armar menús, redactar |
| **Zod** | Verifica que los datos tengan la forma esperada | Que una respuesta rara de la IA no rompa la base de datos |
| **Vitest** | Ejecuta pruebas automáticas | Comprobar que el cálculo de calorías y el filtro de alergias siguen correctos después de cada cambio |
| **@zxing/browser** | Lector de códigos de barras con la cámara del navegador | El escáner, sin app nativa |
| **Open Food Facts** | Base abierta y gratuita de productos con código de barras | Punto de partida del catálogo |
| **Sentry** | Te avisa cuando algo falla a un usuario | Enterarte de los errores sin que te los cuenten |
| **PostHog** | Mide qué hacen los usuarios | Saber en qué pantalla abandonan el onboarding |
| **Resend** | Envío de correos | Confirmación de cuenta y recuperación de contraseña |

### Cómo trabajar con Claude sin ser programador

1. **Una etapa, una conversación.** Nunca "hazme la app". Siempre "implementa la etapa 7 según el documento de arquitectura".
2. **Mantén `docs/ARQUITECTURA.md` en el repositorio** (este archivo) y pégalo o referéncialo al inicio de cada sesión. Es la memoria del proyecto.
3. **Pide el plan antes del código.** "Antes de escribir nada, dime qué archivos vas a crear o modificar y por qué." Léelo. Si no lo entiendes, pide que te lo expliquen.
4. **Pide explicaciones.** "Explícame en lenguaje simple qué hace este archivo." Si no puedes explicárselo a otra persona, no lo integres.
5. **Prueba después de cada etapa.** Ábrelo en el navegador, haz lo que haría un usuario, intenta romperlo.
6. **Guarda en Git al terminar cada etapa que funcione.** Es tu punto de retorno.
7. **Cuando algo falle, entrega el error completo**, no "no funciona".
8. **Usa una rama distinta para cada etapa.** Así lo roto nunca toca lo que ya funcionaba.
9. **Desconfía de los atajos.** Si Claude propone hacer las etapas 10 a 13 de una vez, di que no.
10. **Gemini y ChatGPT como segunda opinión**, no como segundo programador. Dos asistentes escribiendo el mismo código producen un proyecto incoherente. Úsalos para revisar decisiones, no para editar archivos.

---

## PARTE 6 — LAS SEIS DECISIONES QUE DEBES TOMAR ANTES DE ESCRIBIR LA PRIMERA LÍNEA

1. **¿Tres entidades (alimento / producto / inventario) o dos?** Recomendación firme: tres. Cambiarlo después implica rehacer el inventario, el plan y la lista de compras.
2. **¿Recetas curadas o generadas por IA en el MVP?** Recomendación: curadas. Es lo que hace el proyecto seguro, barato y demostrable.
3. **¿Una persona o un hogar?** Recomendación: una persona en el MVP, pero con el campo `personas_hogar` ya creado.
4. **¿Cuál es la unidad base?** Recomendación: gramos y mililitros, siempre, en todo el sistema.
5. **¿Cuál es el piso de seguridad nutricional?** Decídelo ahora, escríbelo como número, y que el código lo respete sin excepciones.
6. **¿Qué métrica define el éxito del MVP?** Propuesta: porcentaje de usuarios de la beta que generan un segundo plan semanal. Todo lo demás es vanidad.

---

## RESUMEN EN UNA FRASE

El proyecto es sólido y su diferencial es real, pero el MVP se juega en tres cosas que el documento todavía no resuelve: **separar el alimento genérico del producto con marca, convertir todo a gramos, y cerrar el ciclo entre plan e inventario.** Resueltas esas tres, el resto es ejecución ordenada.
