# VIDAMED - Aplicación Android

Aplicación móvil nativa para Laboratorio Clínico VIDAMED desarrollada en Kotlin.

## Estructura del Proyecto

```
app/
├── src/main/java/com/vidamed/app/
│   ├── MainActivity.kt
│   ├── activities/
│   │   ├── HomeActivity.kt
│   │   ├── StudiesActivity.kt
│   │   ├── SchedulingActivity.kt
│   │   ├── PatientPortalActivity.kt
│   │   ├── BlogActivity.kt
│   │   ├── AboutActivity.kt
│   │   ├── ContactActivity.kt
│   │   ├── LoginActivity.kt
│   │   └── AdminActivity.kt
│   ├── fragments/
│   │   ├── HomeFragment.kt
│   │   ├── StudiesFragment.kt
│   │   ├── StudyDetailFragment.kt
│   │   ├── SchedulingFragment.kt
│   │   ├── PatientPortalFragment.kt
│   │   ├── BlogFragment.kt
│   │   ├── BlogPostFragment.kt
│   │   ├── AboutFragment.kt
│   │   ├── ContactFragment.kt
│   │   ├── LoginFragment.kt
│   │   ├── admin/
│   │   │   ├── AdminDashboardFragment.kt
│   │   │   ├── StudiesAdminFragment.kt
│   │   │   ├── PostsAdminFragment.kt
│   │   │   ├── TestimonialsAdminFragment.kt
│   │   │   ├── AppointmentsAdminFragment.kt
│   │   │   ├── PatientsAdminFragment.kt
│   │   │   └── StatisticsFragment.kt
│   ├── models/
│   │   ├── Study.kt
│   │   ├── BlogPost.kt
│   │   ├── Testimonial.kt
│   │   ├── Patient.kt
│   │   ├── Appointment.kt
│   │   └── User.kt
│   ├── services/
│   │   ├── SupabaseService.kt
│   │   ├── AIService.kt
│   │   ├── ChatService.kt
│   │   └── AuthService.kt
│   ├── utils/
│   │   ├── Constants.kt
│   │   ├── Extensions.kt
│   │   └── Helpers.kt
│   ├── adapters/
│   │   ├── StudiesAdapter.kt
│   │   ├── BlogPostsAdapter.kt
│   │   ├── TestimonialsAdapter.kt
│   │   ├── PatientsAdapter.kt
│   │   └── MessagesAdapter.kt
│   └── viewmodels/
│       ├── HomeViewModel.kt
│       ├── StudiesViewModel.kt
│       ├── BlogViewModel.kt
│       ├── AuthViewModel.kt
│       └── AdminViewModel.kt
└── src/main/res/
    ├── layout/
    ├── values/
    ├── drawable/
    └── mipmap/
```

## Características Principales

- **Arquitectura MVVM** con LiveData y ViewModel
- **Navegación** con Navigation Component
- **Base de datos** con Supabase
- **Autenticación** segura
- **Chatbot AI** con integración de Google Gemini
- **Sistema de agendamiento** de citas
- **Panel administrativo** completo
- **Diseño responsive** para diferentes tamaños de pantalla

## Requisitos

- Android Studio Ladybug o superior
- Kotlin 1.9+
- Android API 21+ (Android 5.0)

## Instalación

1. Clonar el repositorio
2. Abrir en Android Studio
3. Sincronizar Gradle
4. Configurar variables de entorno
5. Ejecutar la aplicación

## Configuración

Las variables de configuración se encuentran en `local.properties`:

```properties
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
