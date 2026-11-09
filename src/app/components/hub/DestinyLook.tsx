'use client'

import { useEffect, useState } from 'react'
import {
  DESTINY_ACCENTS,
  DESTINY_SCENES,
  bungieArtUrl,
  destinyAccentById,
  destinySceneById,
  sceneCredit,
  type DestinyAccent,
  type DestinyScene,
} from '@/lib/destiny/destinyAtmosphere'

const STORAGE_KEY = 'topnest-destiny-look'

function readStoredLook(): { scene: DestinyScene; accent: DestinyAccent } {
  if (typeof window === 'undefined') {
    return { scene: DESTINY_SCENES[0]!, accent: DESTINY_ACCENTS[0]! }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as { scene?: string; accent?: string }) : {}
    return {
      scene: destinySceneById(parsed.scene),
      accent: destinyAccentById(parsed.accent),
    }
  } catch {
    return { scene: DESTINY_SCENES[0]!, accent: DESTINY_ACCENTS[0]! }
  }
}

function applyLook(scene: DestinyScene, accent: DestinyAccent) {
  const root = document.documentElement
  root.dataset.destinyScene = scene.id
  root.dataset.destinyAccent = accent.id
  root.style.setProperty('--destiny-scene-image', `url("${bungieArtUrl(scene.path)}")`)
  root.style.setProperty('--destiny-accent', accent.color)
  root.style.setProperty('--destiny-on-accent', accent.onColor)
}

export function useDestinyLook() {
  const [look, setLook] = useState(readStoredLook)

  useEffect(() => {
    const stored = readStoredLook()
    setLook(stored)
    applyLook(stored.scene, stored.accent)
  }, [])

  const chooseScene = (id: DestinyScene['id']) => {
    const scene = destinySceneById(id)
    const next = { scene, accent: look.accent }
    setLook(next)
    applyLook(next.scene, next.accent)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scene: scene.id, accent: look.accent.id }))
  }

  const chooseAccent = (id: DestinyAccent['id']) => {
    const accent = destinyAccentById(id)
    const next = { scene: look.scene, accent }
    setLook(next)
    applyLook(next.scene, next.accent)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scene: look.scene.id, accent: accent.id }))
  }

  return { ...look, chooseScene, chooseAccent }
}

export function DestinyLookMenu({
  scene,
  accent,
  onScene,
  onAccent,
}: {
  scene: DestinyScene
  accent: DestinyAccent
  onScene: (id: DestinyScene['id']) => void
  onAccent: (id: DestinyAccent['id']) => void
}) {
  return (
    <details className="gh-look">
      <summary>Look</summary>
      <div className="gh-look-panel">
        <fieldset>
          <legend>Backdrop</legend>
          {DESTINY_SCENES.map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="destiny-scene"
                value={item.id}
                checked={scene.id === item.id}
                onChange={() => onScene(item.id)}
              />
              {item.label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Accent</legend>
          {DESTINY_ACCENTS.map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="destiny-accent"
                value={item.id}
                checked={accent.id === item.id}
                onChange={() => onAccent(item.id)}
              />
              <span className="gh-look-swatch" style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  )
}

export function DestinyLookCredit({ scene }: { scene: DestinyScene }) {
  return <p className="gh-art-credit">{sceneCredit(scene)}</p>
}
