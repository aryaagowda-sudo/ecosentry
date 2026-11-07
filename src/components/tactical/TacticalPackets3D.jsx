import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * Individual Animated Mesh Packet Pulse
 */
function PacketPulse({ packet, nodesMap }) {
  const meshRef = useRef()
  const trailRef = useRef()

  const srcNode = nodesMap.get(packet.currentNode)
  const tgtNode = nodesMap.get(packet.nextNode)

  useFrame((state) => {
    if (!meshRef.current) return

    if (!srcNode || !tgtNode) {
      if (srcNode) {
        meshRef.current.position.set(
          srcNode.position.x,
          srcNode.position.y + 1.2,
          srcNode.position.z
        )
      }
      return
    }

    const t = Math.max(0, Math.min(1, packet.hopProgress || 0))

    // Interpolate 3D position between current and next node with subtle vertical parabolic arc
    const arcHeight = Math.sin(t * Math.PI) * 1.5
    const x = THREE.MathUtils.lerp(srcNode.position.x, tgtNode.position.x, t)
    const y = THREE.MathUtils.lerp(srcNode.position.y, tgtNode.position.y, t) + 1.0 + arcHeight
    const z = THREE.MathUtils.lerp(srcNode.position.z, tgtNode.position.z, t)

    meshRef.current.position.set(x, y, z)

    // Pulse size animation
    const scale = 1.0 + Math.sin(state.clock.elapsedTime * 12) * 0.25
    meshRef.current.scale.set(scale, scale, scale)

    if (trailRef.current) {
      trailRef.current.position.set(x, y, z)
      const trailScale = 1.6 + Math.cos(state.clock.elapsedTime * 8) * 0.4
      trailRef.current.scale.set(trailScale, trailScale, trailScale)
    }
  })

  // Packets in rerouting state flash amber, otherwise luminous cyan
  const packetColor = packet.status === 'rerouting' ? '#f59e0b' : '#00f0ff'

  return (
    <group>
      {/* 1. Luminous Packet Core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshBasicMaterial color={packetColor} />
      </mesh>

      {/* 2. Soft Outer Glowing Aura */}
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.7, 12, 12]} />
        <meshBasicMaterial
          color={packetColor}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * 3D Tactical Packets Collection
 */
export default function TacticalPackets3D({
  packets = [],
  nodesMap = new Map()
}) {
  const activePackets = packets.filter(
    (p) => p.status === 'in_transit' || p.status === 'rerouting'
  )

  return (
    <group>
      {activePackets.map((pkt) => (
        <PacketPulse
          key={pkt.id}
          packet={pkt}
          nodesMap={nodesMap}
        />
      ))}
    </group>
  )
}
