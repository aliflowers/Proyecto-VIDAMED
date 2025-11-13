
# Análisis del Proyecto VIDAMED

## 1. ¿Qué es VIDAMED?

VIDAMED es una plataforma web integral para un laboratorio clínico. Su objetivo es modernizar y optimizar la gestión de pacientes, resultados, estudios y la comunicación con los pacientes. La plataforma cuenta con un sitio público para pacientes y un panel de administración interno para el personal del laboratorio.

## 2. ¿Qué hace el proyecto?

El proyecto VIDAMED ofrece una solución completa para la gestión de un laboratorio clínico, abarcando las siguientes áreas:

- **Sitio web público:**
    - **Página de inicio:** Presenta el laboratorio, sus servicios y testimonios de clientes.
    - **Página "Sobre nosotros":** Ofrece información detallada sobre el laboratorio, su misión, visión y equipo.
    - **Página de estudios:** Muestra un catálogo de los estudios clínicos que ofrece el laboratorio.
    - **Blog:** Publica artículos y noticias de interés para los pacientes.
    - **Página de contacto:** Permite a los usuarios enviar consultas al laboratorio.
    - **Portal del paciente:** Un área privada donde los pacientes pueden ver sus resultados, agendar citas y comunicarse con el laboratorio.
- **Panel de administración:**
    - **Dashboard:** Muestra estadísticas clave y un resumen de la actividad del laboratorio.
    - **Gestión de pacientes:** Permite registrar, buscar y administrar la información de los pacientes.
    - **Gestión de resultados:** Permite cargar, interpretar y publicar los resultados de los estudios.
    - **Gestión de estudios:** Permite crear, editar y administrar los estudios que ofrece el laboratorio.
    - **Gestión de inventario:** Administra el stock de insumos y reactivos del laboratorio.
    - **Gestión de citas:** Permite agendar y administrar las citas de los pacientes.
    - **Gestión de contenido:** Administra el contenido del blog y los testimonios de los clientes.
    - **Configuración del sitio:** Permite personalizar la información y apariencia del sitio web.
    - **Gestión de usuarios:** Administra las cuentas de usuario del personal del laboratorio.
- **Funcionalidades de IA:**
    - **Generador de blogs con IA:** Utiliza AWS Bedrock para generar artículos para el blog del laboratorio.
    - **Chat con IA:** Un chatbot para responder preguntas frecuentes de los pacientes.
    - **Interpretación de resultados con IA:** Un asistente que ayuda al personal del laboratorio a interpretar los resultados de los estudios.

## 3. ¿Cómo funciona?

El proyecto está construido con una arquitectura moderna de aplicación web:

- **Frontend:** Desarrollado con **React** y **Vite**, utilizando **TypeScript** para un código más robusto. La interfaz de usuario se construye con componentes reutilizables y se utiliza **React Router** para la navegación. La aplicación es una **Progressive Web App (PWA)**, lo que permite que se pueda "instalar" en dispositivos y funcionar sin conexión.
- **Backend:** Utiliza **Supabase** como plataforma de backend-as-a-service, lo que proporciona la base de datos, autenticación, almacenamiento de archivos y APIs en tiempo real. Además, cuenta con un backend propio desarrollado en **Node.js** y **TypeScript** (en el directorio `api/`) que se encarga de funcionalidades más complejas como la integración con **AWS Bedrock** para las funcionalidades de IA y el envío de notificaciones por correo electrónico y WhatsApp.
- **Base de datos:** La base de datos es **PostgreSQL**, gestionada a través de Supabase.
- **Estilos:** Se utiliza **Tailwind CSS** para un diseño rápido y moderno.

## 4. ¿Qué problemas resuelve?

VIDAMED resuelve varios problemas comunes en los laboratorios clínicos:

- **Gestión manual y descentralizada:** Centraliza toda la información de pacientes, resultados y estudios en una única plataforma.
- **Comunicación ineficiente con los pacientes:** Ofrece un portal del paciente para una comunicación más directa y eficiente.
- **Procesos lentos y propensos a errores:** Automatiza tareas como la carga de resultados y la generación de informes.
- **Falta de presencia en línea:** Proporciona un sitio web moderno y profesional para atraer a nuevos clientes.
- **Generación de contenido:** El generador de blogs con IA facilita la creación de contenido relevante para los pacientes.

## 5. ¿En qué beneficia al laboratorio?

- **Mayor eficiencia:** Automatiza y optimiza los flujos de trabajo del laboratorio.
- **Reducción de errores:** Minimiza los errores manuales en la gestión de datos.
- **Mejora de la comunicación:** Facilita la comunicación con los pacientes y entre el personal del laboratorio.
- **Mejor toma de decisiones:** Proporciona estadísticas y datos en tiempo real para una mejor toma de decisiones.
- **Imagen más profesional:** Ofrece una imagen más moderna y tecnológica del laboratorio.
- **Ahorro de tiempo y costos:** Reduce el tiempo dedicado a tareas administrativas y optimiza el uso de recursos.

## 6. ¿En qué beneficia al paciente?

- **Acceso rápido y fácil a sus resultados:** Los pacientes pueden ver sus resultados en línea desde cualquier lugar.
- **Agendamiento de citas en línea:** Facilita la programación de citas sin necesidad de llamar por teléfono.
- **Comunicación directa con el laboratorio:** Pueden hacer preguntas y recibir notificaciones a través del portal.
- **Información clara y accesible:** El sitio web y el blog ofrecen información útil sobre su salud.
- **Mejor experiencia general:** Ofrece una experiencia más moderna, cómoda y satisfactoria.

## 7. ¿Por qué se debería de utilizar?

VIDAMED es una solución completa y moderna que puede transformar la forma en que un laboratorio clínico opera. Su uso se justifica por:

- **La necesidad de digitalización en el sector de la salud.**
- **La creciente demanda de los pacientes por un acceso más fácil y rápido a su información de salud.**
- **La necesidad de los laboratorios de ser más eficientes y competitivos.**
- **Las ventajas de utilizar tecnologías de IA para mejorar la calidad y la eficiencia de los servicios.**

En resumen, VIDAMED es una inversión estratégica que puede ayudar a un laboratorio clínico a crecer, a mejorar la calidad de sus servicios y a ofrecer una mejor experiencia a sus pacientes.

---

## Análisis Detallado de Módulos

### **Sitio web público (Análisis Detallado)**

#### **1. Página de Inicio (`HomePage.tsx`)**

*   **Funcionalidad:**
    *   Muestra una sección principal (hero) con un video de fondo para captar la atención.
    *   Incluye una barra de búsqueda para que los pacientes encuentren estudios rápidamente.
    *   Presenta una sección de "Servicios Destacados" para resaltar los análisis más importantes.
    *   Contiene una sección "Por qué elegirnos" para generar confianza.
    *   Muestra un carrusel de "Testimonios" reales de pacientes, obtenidos desde la base de datos.
    *   Integra una sección con las últimas entradas del "Blog" para mantener a los usuarios informados.
*   **Problemas que Resuelve:**
    *   **Falta de una primera impresión profesional:** Reemplaza un sitio web obsoleto o la inexistencia de uno con una página moderna y atractiva.
    *   **Dificultad para encontrar información:** Centraliza la información clave y la hace accesible desde la primera visita.
    *   **Desconfianza del paciente:** Los testimonios y la sección de "Por qué elegirnos" ayudan a construir credibilidad.
*   **Beneficios:**
    *   **Para el Laboratorio:** Mejora la imagen de marca, atrae nuevos pacientes y reduce la carga de consultas básicas al personal.
    *   **Para el Paciente:** Ofrece una experiencia de usuario agradable, fácil navegación y acceso rápido a la información que necesita.

#### **2. Página "Sobre Nosotros" (`AboutPage.tsx`)**

*   **Funcionalidad:**
    *   Presenta la misión, visión y valores del laboratorio.
    *   Narra la historia de la empresa para crear una conexión emocional.
    *   Muestra al equipo directivo o personal clave.
*   **Problemas que Resuelve:**
    *   **Anonimato y falta de conexión:** Humaniza el laboratorio, mostrando las personas y la filosofía detrás del servicio.
    *   **Dudas sobre la credibilidad y experiencia:** La historia y la presentación del equipo refuerzan la trayectoria y el profesionalismo.
*   **Beneficios:**
    *   **Para el Laboratorio:** Fortalece la identidad de marca y genera confianza al mostrar su lado humano y su experiencia.
    *   **Para el Paciente:** Permite conocer mejor el laboratorio en el que confían su salud, creando un vínculo más fuerte.

#### **3. Página de Estudios (`StudiesPage.tsx`)**

*   **Funcionalidad:**
    *   Actúa como un catálogo completo de todos los estudios clínicos disponibles.
    *   Permite buscar estudios por nombre y filtrarlos por categoría.
    *   Cada estudio se muestra en una "tarjeta" con detalles clave: nombre, descripción, preparación requerida, tiempo de entrega de resultados y precio (en USD y moneda local).
    *   Carga los estudios de forma dinámica desde la base de datos de Supabase.
*   **Problemas que Resuelve:**
    *   **Información de estudios dispersa o desactualizada:** Centraliza todos los estudios en un solo lugar, fácil de actualizar.
    *   **Consultas repetitivas al personal:** Los pacientes pueden resolver dudas sobre precios, preparación y disponibilidad de estudios por sí mismos.
    *   **Falta de transparencia en precios:** Muestra los costos de forma clara y por adelantado.
*   **Beneficios:**
    *   **Para el Laboratorio:** Reduce drásticamente el tiempo que el personal dedica a responder preguntas sobre los estudios. Facilita la gestión y actualización de la oferta de servicios.
    *   **Para el Paciente:** Ofrece autonomía y transparencia. Pueden informarse y comparar estudios a su propio ritmo, 24/7.

#### **4. Página de Blog (`BlogPage.tsx`)**

*   **Funcionalidad:**
    *   Muestra una lista de artículos informativos.
    *   Cada entrada incluye título, resumen, categoría, imagen, autor y fecha.
    *   El contenido se obtiene dinámicamente desde Supabase.
*   **Problemas que Resuelve:**
    *   **Falta de comunicación proactiva sobre salud:** Posiciona al laboratorio como una fuente de información confiable, no solo como un proveedor de servicios.
    *   **Bajo engagement y tráfico web:** El contenido de calidad mejora el SEO (posicionamiento en buscadores) y atrae visitantes interesados en temas de salud.
*   **Beneficios:**
    *   **Para el Laboratorio:** Se establece como una autoridad en su campo, mejora el marketing de contenidos y la relación con la comunidad.
    *   **Para el Paciente:** Recibe información valiosa y educativa sobre salud, prevención y bienestar.

#### **5. Página de Contacto (`ContactPage.tsx`)**

*   **Funcionalidad:**
    *   Proporciona un formulario de contacto para enviar mensajes directamente al laboratorio.
    *   Muestra información clave: dirección, número de WhatsApp, email y horarios de atención.
    *   Integra un mapa de Google para facilitar la localización física del laboratorio.
*   **Problemas que Resuelve:**
    *   **Dificultad para contactar al laboratorio:** Centraliza todos los canales de comunicación en un solo lugar.
    *   **Pacientes perdidos o con dificultades para llegar:** El mapa interactivo simplifica la ubicación.
*   **Beneficios:**
    *   **Para el Laboratorio:** Organiza y centraliza las consultas de los usuarios, mejorando el tiempo de respuesta.
    *   **Para el Paciente:** Ofrece múltiples y claras opciones para comunicarse o visitar el laboratorio.

#### **6. Portal del Paciente (`PatientPortalPage.tsx`)**

*   **Funcionalidad:**
    *   Permite a los pacientes buscar y acceder a su historial de resultados usando su número de cédula.
    *   Muestra una lista de todos sus estudios y el estado de los resultados.
    *   Permite visualizar los resultados, ya sea abriendo un archivo (PDF) o mostrando los datos de un resultado manual.
    *   Incluye un formulario para que los pacientes puedan enviar sus testimonios sobre el servicio.
*   **Problemas que Resuelve:**
    *   **Dependencia del medio físico o email para entregar resultados:** Elimina la necesidad de que el paciente se desplace al laboratorio solo para retirar un resultado.
    *   **Pérdida de resultados anteriores:** Proporciona un historial centralizado y accesible en cualquier momento.
    *   **Proceso de feedback ineficiente:** Facilita la recolección de testimonios valiosos para el marketing del laboratorio.
*   **Beneficios:**
    *   **Para el Laboratorio:** Ahorra costos de impresión y tiempo del personal en la entrega de resultados. Automatiza la recolección de feedback.
    *   **Para el Paciente:** Ofrece máxima comodidad, privacidad y control sobre su información de salud. Pueden acceder a sus resultados 24/7 desde cualquier dispositivo.

---

### **Panel de Administración (Análisis Detallado)**

#### **1. Dashboard (`DashboardPage.tsx`)**

*   **Funcionalidad:**
    *   Es la página principal del panel de administración.
    *   Muestra **KPIs (Indicadores Clave de Rendimiento)** importantes de un vistazo: número total de pacientes, estudios y citas.
    *   Presenta gráficos sobre la actividad del laboratorio:
        *   **Top 5 Estudios más solicitados** en la última semana.
        *   **Actividad de Citas** de los últimos 7 días.
    *   Incluye listas de "Citas de la Semana" y "Nuevos Pacientes de la Semana".
    *   Ofrece "Accesos Rápidos" a las secciones más importantes (Gestionar Estudios, Pacientes, Citas, Blog).
*   **Problemas que Resuelve:**
    *   **Falta de visibilidad sobre el rendimiento del negocio:** Proporciona una visión clara y en tiempo real de la operación del laboratorio.
    *   **Toma de decisiones basada en intuición:** Ofrece datos concretos para identificar tendencias, como qué estudios son los más populares o qué días hay más actividad.
*   **Beneficios:**
    *   **Para el Laboratorio:** Permite una gestión proactiva y basada en datos. Ayuda a la gerencia a entender rápidamente el estado del laboratorio y a planificar estrategias (ej. promocionar estudios menos solicitados, optimizar personal en días de alta demanda).

#### **2. Gestión de Pacientes (`PatientsAdminPage.tsx`)**

*   **Funcionalidad:**
    *   Permite al personal autorizado **registrar nuevos pacientes** a través de un formulario.
    *   Muestra una tabla con todos los pacientes registrados.
    *   Incluye una barra de **búsqueda** para encontrar pacientes rápidamente por nombre, apellido o cédula.
    *   Permite **editar la información** de un paciente existente.
    *   Integra un sistema de **permisos por roles** (`hasPermission`) que limita quién puede editar la información.
*   **Problemas que Resuelve:**
    *   **Registros en papel o en hojas de cálculo desorganizadas:** Centraliza toda la información de los pacientes en una base de datos única, segura y fácil de gestionar.
    *   **Errores de duplicidad o datos incorrectos:** Un sistema centralizado reduce la probabilidad de tener información inconsistente.
    *   **Acceso no autorizado a datos sensibles:** El sistema de permisos asegura que solo el personal calificado pueda modificar la información del paciente.
*   **Beneficios:**
    *   **Para el Laboratorio:** Mejora la integridad y seguridad de los datos de los pacientes. Optimiza el tiempo del personal administrativo al facilitar la búsqueda y gestión de la información.

#### **3. Gestión de Resultados (`ResultsPage.tsx`)**

*   **Funcionalidad:**
    *   Es el módulo más complejo y central del sistema. Permite **gestionar el ciclo de vida completo de un resultado**.
    *   **Carga de Resultados por Archivo:** Permite subir un archivo (ej. PDF) y asociarlo a un paciente y un estudio específico.
    *   **Ingreso de Resultados Manual:** Ofrece un formulario dinámico para ingresar resultados que no vienen en un archivo. Los campos del formulario se adaptan al tipo de estudio seleccionado.
    *   **Integración con Inventario:** Al guardar un resultado manual, el sistema **descuenta automáticamente los materiales utilizados** del módulo de inventario.
    *   **Análisis con Inteligencia Artificial:**
        *   Permite generar una **interpretación preliminar del resultado** usando AWS Bedrock.
        *   El personal médico puede **revisar, editar, aprobar o rechazar** esta interpretación.
        *   Se puede **re-generar la interpretación** si los valores del resultado son modificados.
    *   **Visualización y Búsqueda:** Permite ver los detalles de cualquier resultado y buscar/filtrar en toda la base de datos.
    *   **Control de Permisos:** Acciones críticas como eliminar, generar análisis o aprobar están protegidas por el sistema de roles.
*   **Problemas que Resuelve:**
    *   **Procesos de resultados lentos y fragmentados:** Unifica la carga, ingreso, interpretación y publicación en un solo flujo de trabajo.
    *   **Descontrol del inventario:** La deducción automática de materiales resuelve el problema de no saber qué insumos se han gastado y cuándo reponerlos.
    *   **Carga de trabajo en la interpretación de resultados:** La IA actúa como un asistente que agiliza la redacción de informes, reduciendo el tiempo que el especialista dedica a cada caso.
    *   **Falta de estandarización en los informes:** La IA ayuda a generar informes con un formato y calidad consistentes.
*   **Beneficios:**
    *   **Para el Laboratorio:**
        *   **Eficiencia radical:** Reduce drásticamente el tiempo desde que se toma la muestra hasta que el resultado está disponible para el paciente.
        *   **Optimización de recursos:** El control de inventario automático previene la falta de stock y optimiza las compras.
        *   **Mejora en la calidad del servicio:** La asistencia de la IA puede reducir errores y mejorar la consistencia de los informes, liberando tiempo del especialista para casos más complejos.
        *   **Trazabilidad completa:** Cada paso del proceso queda registrado en el sistema.

#### **4. Gestión de Inventario (`InventoryPage.tsx`)**

*   **Funcionalidad:**
    *   Permite registrar y catalogar todos los materiales, reactivos e insumos del laboratorio.
    *   Muestra el inventario en dos vistas: tarjetas visuales o una tabla detallada.
    *   Incluye un formulario para añadir/editar materiales con campos como nombre, descripción, proveedor, costo, unidad de medida y stock mínimo de alerta.
    *   Ofrece filtros avanzados para encontrar materiales por múltiples criterios (nombre, proveedor, rango de stock, etc.).
    *   Implementa un sistema de **eliminación segura**, que impide borrar un material si está siendo utilizado por algún estudio clínico, previniendo errores críticos.
    *   Control de permisos para acciones como crear, editar y eliminar.
*   **Problemas que Resuelve:**
    *   **Pérdida de control sobre el stock:** Reemplaza el seguimiento manual (o la falta de él) con un sistema centralizado y en tiempo real.
    *   **Compras ineficientes:** Alertas de stock mínimo ayudan a saber exactamente cuándo y qué reponer, evitando compras de pánico o exceso de inventario.
    *   **Interrupciones del servicio:** Previene la situación crítica de no poder realizar un estudio por falta de un reactivo o material.
*   **Beneficios:**
    *   **Para el Laboratorio:**
        *   **Optimización de costos:** Reduce el desperdicio y permite una planificación de compras más inteligente.
        *   **Continuidad operativa:** Asegura que los materiales siempre estén disponibles cuando se necesiten.
        *   **Eficiencia administrativa:** Simplifica y automatiza el seguimiento del inventario.

#### **5. Gestión de Blog y Contenido (`PostsAdminPage.tsx` y `PostForm.tsx`)**

*   **Funcionalidad:**
    *   Permite crear, editar y eliminar las publicaciones del blog que se muestran en el sitio público.
    *   El formulario de creación (`PostForm`) es donde reside la **funcionalidad de IA**.
    *   **Generación de Contenido con IA:** El personal puede simplemente escribir un título o una idea, y el sistema, conectado a AWS Bedrock, genera un borrador completo del artículo (título, contenido, resumen, etc.).
    *   El personal puede luego revisar, editar y publicar el contenido generado por la IA.
    *   Permite subir imágenes y gestionar campos de SEO (meta título, descripción, palabras clave) para mejorar el posicionamiento en buscadores.
*   **Problemas que Resuelve:**
    *   **Falta de tiempo para crear contenido:** La generación de contenido es una tarea que consume mucho tiempo y que a menudo se descuida.
    *   **Bloqueo creativo o "página en blanco":** La IA proporciona un punto de partida sólido, eliminando la dificultad de empezar a escribir desde cero.
    *   **Contenido poco atractivo o no optimizado para SEO:** La IA puede ayudar a generar textos bien estructurados y a sugerir elementos clave para el SEO.
*   **Beneficios:**
    *   **Para el Laboratorio:**
        *   **Marketing de contenidos a escala:** Permite mantener el blog actualizado con contenido relevante y de calidad con una fracción del esfuerzo.
        *   **Mejora del SEO:** Un flujo constante de contenido nuevo ayuda a atraer más tráfico orgánico desde Google.
        *   **Ahorro de tiempo significativo** para el personal de marketing o administración.

#### **6. Gestión de Citas y Disponibilidad (`AppointmentsAdminPage.tsx`)**

*   **Funcionalidad:**
    *   Muestra una lista de todas las citas agendadas, con la capacidad de filtrar por estado (pendiente, confirmada, cancelada) y ubicación (sede o a domicilio).
    *   Permite al personal **confirmar, cancelar o reagendar** una cita.
    *   **Gestión de Disponibilidad:**
        *   Ofrece un calendario donde el personal puede **bloquear días completos** (ej. feriados).
        *   Permite **gestionar la disponibilidad por franjas horarias** para cada día y ubicación, bloqueando o desbloqueando horas específicas.
    *   El sistema de permisos puede restringir la gestión de citas a la sede a la que pertenece el empleado, evitando que un usuario de la Sede A modifique citas de la Sede B.
*   **Problemas que Resuelve:**
    *   **Overbooking o agendamiento en días no laborables:** El sistema impide que los pacientes agenden citas cuando no hay disponibilidad.
    *   **Gestión manual y caótica de la agenda:** Reemplaza el cuaderno de citas o calendarios dispersos con una agenda centralizada y en tiempo real.
    *   **Falta de visibilidad sobre la ocupación:** Permite ver rápidamente qué tan ocupado está el laboratorio en un día o semana determinados.
*   **Beneficios:**
    *   **Para el Laboratorio:**
        *   **Optimización de la agenda:** Maximiza la ocupación y minimiza los tiempos muertos.
        *   **Reducción de errores de agendamiento:** Evita conflictos de horarios y citas mal asignadas.
        *   **Mejora la experiencia del paciente:** El paciente solo ve y puede seleccionar horarios que están realmente disponibles, evitando frustraciones.

---

### **Módulos del Backend (API) (Análisis Detallado)**

El backend de VIDAMED está construido como una API de Node.js con Express, utilizando TypeScript para un desarrollo robusto y escalable. La API se encarga de la lógica de negocio, la comunicación con la base de datos (Supabase) y la integración con servicios de terceros como AWS Bedrock y ElevenLabs.

#### **1. Core API (`api/index.ts` y `api/chat.ts`)**

*   **Funcionalidad:**
    *   **`api/index.ts`**: Es el punto de entrada principal de la API. Configura el servidor Express, maneja el CORS y define los endpoints principales. Contiene la lógica para clasificar la intención del usuario, extraer información de los mensajes y aplicar barandillas de salida a las respuestas de la IA.
    *   **`api/chat.ts`**: Contiene la lógica central del "VidaBot", el asistente de IA conversacional. Orquesta las interacciones con AWS Bedrock y Supabase, gestiona el historial de la conversación, infiere la intención del usuario e implementa un estricto proceso de llenado de ranuras para la programación de citas. Define las herramientas que la IA puede utilizar, como `getAvailability`, `getAvailableHours` y `scheduleAppointment`.
*   **Problemas que Resuelve:**
    *   **Lógica de negocio dispersa:** Centraliza las operaciones complejas del backend en un solo lugar.
    *   **Interacción compleja con la IA:** Abstrae la complejidad de comunicarse con AWS Bedrock y gestionar el flujo de una conversación.
*   **Beneficios:**
    *   **Para el Laboratorio:** Proporciona un backend escalable y mantenible que soporta las funcionalidades avanzadas de la plataforma.

#### **2. Generación de Contenido con IA (`api/generate-blog-post.ts`)**

*   **Funcionalidad:**
    *   Expone un endpoint (`/api/generate-blog-post`) que utiliza AWS Bedrock para generar contenido de blog en un formato JSON estructurado.
    *   El contenido se genera en base a un tema, tipo de publicación, categorías, tono y público objetivo proporcionados.
*   **Problemas que Resuelve:**
    *   **Falta de tiempo para crear contenido:** Automatiza la creación de borradores de artículos, superando el "bloqueo del escritor".
*   **Beneficios:**
    *   **Para el Laboratorio:** Permite mantener el blog actualizado con contenido de calidad con un esfuerzo mínimo, mejorando el SEO y el engagement.

#### **3. Interpretación de Resultados con IA (`api/interpretar.ts`)**

*   **Funcionalidad:**
    *   El endpoint `/api/interpretar` utiliza AWS Bedrock para generar interpretaciones preliminares de los resultados de los estudios médicos.
    *   Obtiene los datos del paciente y del estudio de Supabase, construye un prompt detallado y devuelve un análisis profesional en formato Markdown.
    *   Está diseñado para actuar como un asistente, no para reemplazar el juicio médico, evitando estrictamente los diagnósticos definitivos.
*   **Problemas que Resuelve:**
    *   **Carga de trabajo en la redacción de informes:** Agiliza la creación de la sección de interpretación de los resultados.
*   **Beneficios:**
    *   **Para el Laboratorio:** Ahorra tiempo valioso al personal médico, permitiéndoles enfocarse en la revisión y en los casos más complejos. Aumenta la consistencia de los informes.

#### **4. Configuración de la IA (`api/config.ts`)**

*   **Funcionalidad:**
    *   Exporta la configuración del modelo de IA a utilizar para Amazon Bedrock.
*   **Problemas que Resuelve:**
    *   **Configuración hardcodeada:** Centraliza la configuración del modelo, facilitando su actualización o cambio en el futuro.
*   **Beneficios:**
    *   **Para el Laboratorio:** Mejora la mantenibilidad del código y permite experimentar con diferentes modelos de IA de forma sencilla.

#### **5. Cliente de AWS Bedrock (`api/bedrock.ts`)**

*   **Funcionalidad:**
    *   Proporciona un cliente reutilizable para interactuar con AWS Bedrock.
    *   Es compatible con la API de OpenAI, lo que facilita la integración.
    *   Maneja la autenticación, el formato de los mensajes, las llamadas a herramientas y el post-procesamiento de las respuestas.
*   **Problemas que Resuelve:**
    *   **Código repetitivo para llamadas a la IA:** Evita tener que reescribir la lógica de conexión a Bedrock en cada módulo que la necesita.
*   **Beneficios:**
    *   **Para el Laboratorio:** Promueve la reutilización de código y simplifica el desarrollo de nuevas funcionalidades de IA.

#### **6. Sistema de Notificaciones (`api/notify/`)**

*   **Funcionalidad:**
    *   **`appointment-email.ts`**: Envía correos electrónicos de confirmación y recordatorio de citas usando `nodemailer` con plantillas HTML.
    *   **`email.ts`**: Envía correos con los resultados de los estudios como archivos adjuntos en PDF, generándolos si es necesario.
    *   **`whatsapp.ts`**: Envía notificaciones por WhatsApp cuando los resultados están listos, utilizando la API de Facebook Graph.
*   **Problemas que Resuelve:**
    *   **Comunicación manual con el paciente:** Automatiza el envío de notificaciones clave en el ciclo de vida del paciente.
*   **Beneficios:**
    *   **Para el Laboratorio:** Reduce la carga de trabajo administrativo y asegura una comunicación oportuna.
    *   **Para el Paciente:** Mejora la experiencia al mantenerlo informado de forma proactiva.

#### **7. Funcionalidades de Voz (`api/voice/token.ts`)**

*   **Funcionalidad:**
    *   Proporciona un endpoint (`/api/voice/token`) que genera de forma segura un token de conversación temporal para el servicio de IA conversacional de ElevenLabs.
*   **Problemas que Resuelve:**
    *   **Exposición de claves de API en el frontend:** Permite que el cliente se comunique con el servicio de voz sin tener acceso directo a la clave secreta de la API.
*   **Beneficios:**
    *   **Para el Laboratorio:** Asegura que las claves de API de servicios de terceros se mantengan seguras en el backend, siguiendo las mejores prácticas de seguridad.
