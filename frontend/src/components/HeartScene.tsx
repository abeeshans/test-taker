'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, GradientTexture, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'

function Heart({ position, scale, speed, rotationSpeed, active, exiting, index, positions }: { position: [number, number, number], scale: number, speed: number, rotationSpeed: number, active: boolean, exiting: boolean, index: number, positions: React.MutableRefObject<THREE.Vector3[]> }) {
  const mesh = useRef<THREE.Group>(null)
  const [hovered, setHover] = useState(false)
  const { scene } = useGLTF('/heart.glb')
  
  // Clone scene for each instance
  const clonedScene = useMemo(() => scene.clone(), [scene])

  // Apply glossy material to the model
  useLayoutEffect(() => {
    clonedScene.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.material = new THREE.MeshPhysicalMaterial({
          color: "#ec4899", // Rich Pink
          emissive: "#be185d",
          emissiveIntensity: 0.2,
          roughness: 0.1,
          metalness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          reflectivity: 1.0
        })
      }
    })
  }, [clonedScene])
  
  // Physics state
  const velocity = useRef(new THREE.Vector3(0, speed * 0.01, 0))
  const currentPosition = useRef(new THREE.Vector3(...position))

  useFrame((state) => {
    if (!mesh.current) return
    
    // Update shared position for collision check
    positions.current[index].copy(currentPosition.current)

    // 1. Update Velocity based on state
    if (exiting) {
        // EXPLODE OUTWARDS (2D only)
        // Calculate vector from center (0,0,0) to current position, ignoring Z
        const explosionDir = new THREE.Vector3(currentPosition.current.x, currentPosition.current.y, 0).normalize()
        // Add strong outward force
        velocity.current.add(explosionDir.multiplyScalar(0.05))
        // Zero out Z velocity to keep them flat
        velocity.current.z = 0
    } else if (active) {
        // Float up
        velocity.current.y += (speed * 0.001) // Faster acceleration
        velocity.current.y = Math.min(velocity.current.y, speed * 0.04) // Higher max speed
        
        // Reset if too high
        if (currentPosition.current.y > 15) {
            currentPosition.current.y = -10 // Reset closer to bottom
            currentPosition.current.x = (Math.random() - 0.5) * 25
            velocity.current.y = speed * 0.02 // Maintain momentum
        }

        // COLLISION DETECTION
        // Check against all other hearts
        const radius = 1.2 // Approximate collision radius based on scale
        for (let i = 0; i < positions.current.length; i++) {
            if (i === index) continue
            
            const otherPos = positions.current[i]
            // Simple distance check (squared for performance)
            const distSq = currentPosition.current.distanceToSquared(otherPos)
            
            if (distSq < radius * radius) {
                // Collision! Repel
                const dir = currentPosition.current.clone().sub(otherPos).normalize()
                // Apply force inversely proportional to distance (closer = stronger push)
                const force = (radius - Math.sqrt(distSq)) * 0.02
                velocity.current.add(dir.multiplyScalar(force))
            }
        }

    } else {
        // Float away fast (legacy fallback, shouldn't be hit if exiting is used)
        velocity.current.y += 0.02
    }

    // 2. Mouse Interaction (2D Projected Check) - Only when active and not exiting
    if (active && !exiting) {
        const tempV = new THREE.Vector3()
        tempV.copy(currentPosition.current).project(state.camera)
        
        const dx = tempV.x - state.pointer.x
        const dy = tempV.y - state.pointer.y
        const distSq = dx * dx + dy * dy
        
        if (distSq < 0.1) {
          const vector = new THREE.Vector3(state.pointer.x, state.pointer.y, 0.5)
          vector.unproject(state.camera)
          const dir = vector.sub(state.camera.position).normalize()
          const distance = (currentPosition.current.z - state.camera.position.z) / dir.z
          const mouseWorldPos = state.camera.position.clone().add(dir.multiplyScalar(distance))
          
          const repulsion = currentPosition.current.clone().sub(mouseWorldPos).normalize()
          
          const force = (0.1 - distSq) * 0.5 
          velocity.current.add(repulsion.multiplyScalar(force))
        }
    }

    // 3. Apply Velocity
    currentPosition.current.add(velocity.current)
    
    // 4. Drag/Friction (Less drag when exiting for faster explosion)
    const drag = exiting ? 0.98 : 0.92
    velocity.current.x *= drag
    velocity.current.z *= drag
    
    // 5. Update Mesh
    mesh.current.position.copy(currentPosition.current)

    // Rotation
    mesh.current.rotation.x += rotationSpeed * 0.01
    mesh.current.rotation.y += rotationSpeed * 0.01
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <primitive 
        object={clonedScene}
        ref={mesh}
        position={position}
        scale={scale}
        rotation={[Math.PI, 0, 0]}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      />
    </Float>
  )
}

useGLTF.preload('/heart.glb')

export default function HeartScene({ active, exiting }: { active: boolean, exiting?: boolean }) {
  const [hasActivated, setHasActivated] = useState(false)
  
  // Shared positions for collision detection
  const heartCount = 40
  const positions = useRef<THREE.Vector3[]>(new Array(heartCount).fill(null).map(() => new THREE.Vector3()))

  useEffect(() => {
    if (active) {
        setHasActivated(true)
    }
  }, [active])

  const hearts = useMemo(() => {
    return Array.from({ length: heartCount }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 25,
        -10 - Math.random() * 10, // Spawn closer (-10 instead of -20)
        (Math.random() - 0.5) * 10 - 2
      ] as [number, number, number],
      scale: 0.5 + Math.random() * 0.5, // Larger hearts (was 0.2 + 0.3)
      speed: 0.5 + Math.random() * 1.5,
      rotationSpeed: (Math.random() - 0.5) * 2
    }))
  }, [])

  if (!hasActivated && !active && !exiting) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 45 }} 
        style={{ pointerEvents: 'none' }} // Canvas itself shouldn't block, but events should pass through
        eventSource={document.body} // Listen to events on body
        eventPrefix="client"
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} color="#fce7f3" intensity={0.5} />
        
        {hearts.map((props, i) => (
          <Heart key={i} {...props} active={active} exiting={!!exiting} index={i} positions={positions} />
        ))}
        
        <Environment preset="sunset" />
      </Canvas>
    </div>
  )
}
