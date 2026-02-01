# URDF Editor

Ein web-basierter Editor zum Erstellen und Bearbeiten von URDF-Robotermodellen.
Bisher nur auf MacOS getestet. 

## Features

- **Interaktiver 3D-Designer**: Vollständige 3D-Ansicht mit Orbit-Steuerung
- **Link-Erstellung**: Box, Zylinder, Kugel mit einstellbaren Abmessungen
- **Connection Points**: Platzierbare Verbindungspunkte auf Links
- **Drag & Drop Joints**: Verbinden Sie Links durch Ziehen zwischen Connection Points
- **Joint-Typen**: Revolute, Prismatic, Fixed
- **Joint-Konfiguration**: Limits, Achse, Dynamics, Live-Preview
- **URDF Import/Export**: Laden und speichern von URDF-Dateien
- **Undo/Redo**: Vollständige Rückgängig-Funktionalität
- **Hierarchy Tree**: Übersichtliche Baumansicht der Roboterstruktur

## Schnellstart

### Voraussetzungen

- Python 3.10+
- Node.js 18+
- npm

### Installation

1. **Backend-Abhängigkeiten installieren:**

```bash
cd backend
pip install -r requirements.txt
```

2. **Frontend-Abhängigkeiten installieren:**

```bash
cd frontend
npm install
```

### Starten

**Einfach mit dem Startskript:**

```bash
./start.sh
```

**Oder manuell:**

Backend:
```bash
cd backend
uvicorn main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm run dev
```

Öffnen Sie http://localhost:5173 im Browser.

## Tastenkürzel

| Taste | Funktion |
|-------|----------|
| V / Esc | Auswahlmodus |
| G | Verschieben |
| R | Rotieren |
| S | Skalieren |
| L | Neuen Link erstellen |
| P | Connection Point hinzufügen |
| Delete | Auswahl löschen |
| Cmd/Ctrl+Z | Rückgängig |
| Cmd/Ctrl+Shift+Z | Wiederholen |

## Workflow

1. **Link erstellen**: Drücke `L`, wähle Geometrie und Eigenschaften
2. **Connection Points hinzufügen**: Wähle einen Link, klicke "Add Connection Point"
3. **Links verbinden**: Klicke auf einen Connection Point und ziehe zu einem anderen
4. **Joint konfigurieren**: Wähle den Joint und stelle Limits/Dynamics ein
5. **Exportieren**: Klicke Export, um die URDF-Datei zu speichern

## API Dokumentation

Die API-Dokumentation ist verfügbar unter:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Technologie-Stack

- **Backend**: FastAPI, Python, yourdfpy
- **Frontend**: React, TypeScript, React Three Fiber
- **3D**: Three.js, @react-three/drei
- **State**: Zustand mit zundo (Undo/Redo)
- **UI**: Radix UI, Tailwind CSS

## Projektstruktur

```
urdf-editor/
├── backend/
│   ├── main.py              # FastAPI Einstiegspunkt
│   ├── api/routes/          # API-Endpunkte
│   ├── services/            # URDF-Service
│   └── models/              # Pydantic-Modelle
├── frontend/
│   ├── src/
│   │   ├── components/      # React-Komponenten
│   │   ├── stores/          # Zustand Stores
│   │   ├── hooks/           # Custom Hooks
│   │   └── types/           # TypeScript-Typen
│   └── package.json
└── start.sh                 # Start-Skript
```
