import React, { Component, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import {
  getTerrainElevation,
  getRiverCenterlineX,
  gridToWorld
} from './terrainHelper'
import { INITIAL_SENSORS, INITIAL_EVENTS } from '../../data/mockData'

const TREE_ASSETS = {
  broadleaf: '/assets/forest/mature-english-oak.glb',
  conifer: '/assets/forest/mature-norway-spruce.glb',
  riparian: '/assets/forest/mature-common-alder.glb',
  willow: '/assets/forest/mature-white-willow.glb',
  shrub: '/assets/forest/young-hazel-shrub.glb'
}

function prepareAsset(scene, targetHeight) {
  const clone = scene.clone(true)
  const bounds = new THREE.Box3().setFromObject(clone)
  const size = bounds.getSize(new THREE.Vector3())
  const scale = targetHeight / Math.max(size.y, 0.001)
  clone.scale.setScalar(scale)
  clone.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      if (child.material) child.material = child.material.clone()
    }
  })
  const scaledBounds = new THREE.Box3().setFromObject(clone)
  clone.position.y -= scaledBounds.min.y
  return clone
}

function AssetTree({ scene, tree, height, variant = 0 }) {
  const model = useMemo(() => prepareAsset(scene, height), [scene, height])
  const position = [tree.x, tree.y, tree.z]
  const scale = tree.scale * (0.92 + (variant % 5) * 0.045)
  return <primitive object={model} position={position} rotation={[0, tree.rot, 0]} scale={scale} />
}

function AssetGroup({ scene, list, height, variantOffset = 0 }) {
  return list.map((tree, index) => (
    <AssetTree key={`${tree.x}-${tree.z}-${index}`} scene={scene} tree={tree} height={height} variant={index + variantOffset} />
  ))
}

function ProceduralFallback({ lists }) {
  const trunk = useMemo(() => new THREE.CylinderGeometry(0.16, 0.25, 2, 5), [])
  const crown = useMemo(() => new THREE.IcosahedronGeometry(1.5, 1), [])
  return (
    <group>
      {lists.map((tree, index) => (
        <group key={`fallback-${index}`} position={[tree.x, tree.y, tree.z]} rotation={[0, tree.rot, 0]} scale={tree.scale}>
          <mesh geometry={trunk} position={[0, 1, 0]} castShadow>
            <meshStandardMaterial color="#352719" roughness={0.9} />
          </mesh>
          <mesh geometry={crown} position={[0, 2.5, 0]} scale={[1, 0.9, 1]} castShadow>
            <meshStandardMaterial color="#2d6841" roughness={0.86} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

class AssetErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

function LoadedVegetation({ pineList, broadleafList, riverTreeList, shrubList }) {
  const broadleaf = useGLTF(TREE_ASSETS.broadleaf).scene
  const conifer = useGLTF(TREE_ASSETS.conifer).scene
  const riparian = useGLTF(TREE_ASSETS.riparian).scene
  const willow = useGLTF(TREE_ASSETS.willow).scene
  const shrub = useGLTF(TREE_ASSETS.shrub).scene

  const willowList = riverTreeList.filter((_, index) => index % 3 === 0)
  const alderList = riverTreeList.filter((_, index) => index % 3 !== 0)

  return (
    <group>
      <AssetGroup scene={conifer} list={pineList} height={15} variantOffset={3} />
      <AssetGroup scene={broadleaf} list={broadleafList} height={12} variantOffset={11} />
      <AssetGroup scene={willow} list={willowList} height={8} variantOffset={19} />
      <AssetGroup scene={riparian} list={alderList} height={9} variantOffset={23} />
      <AssetGroup scene={shrub} list={shrubList} height={3.2} variantOffset={31} />
    </group>
  )
}

export default function Vegetation() {
  const { clearedZones } = useMemo(() => {
    const zones = []
    INITIAL_SENSORS.forEach((sensor) => {
      const [x, , z] = gridToWorld(sensor.coordinates.x, sensor.coordinates.y)
      zones.push({ x, z, radius: 4.2 })
    })
    INITIAL_EVENTS.forEach((event) => {
      const [x, , z] = gridToWorld(event.coordinates.x, event.coordinates.y)
      zones.push({ x, z, radius: 3.8 })
    })
    return { clearedZones: zones }
  }, [])

  const lists = useMemo(() => {
    const pines = []
    const broadleafs = []
    const riverTrees = []
    const shrubs = []
    let seed = 123456
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const isCleared = (x, z) => {
      if (Math.abs(x - getRiverCenterlineX(z)) < 4.8) return true
      if (clearedZones.some((zone) => (x - zone.x) ** 2 + (z - zone.z) ** 2 < zone.radius ** 2)) return true
      return Math.abs(x) > 44 || Math.abs(z) > 44
    }

    let attempts = 0
    while (pines.length + broadleafs.length + riverTrees.length + shrubs.length < 128 && attempts < 1000) {
      attempts += 1
      const x = -44 + rnd() * 88
      const z = -44 + rnd() * 88
      if (isCleared(x, z)) continue
      const y = getTerrainElevation(x, z)
      const riverDistance = Math.abs(x - getRiverCenterlineX(z))
      const tree = { x, y, z, scale: 0.78 + rnd() * 0.42, rot: rnd() * Math.PI * 2 }

      if (riverDistance < 10) riverTrees.push({ ...tree, scale: tree.scale * 0.8 })
      else if (x < 8 && z < 8) (rnd() > 0.42 || y > 7 ? pines : broadleafs).push(tree)
      else if (x <= 5 && z > 5) (rnd() > 0.5 ? broadleafs : rnd() > 0.4 ? pines : shrubs).push(tree)
      else if (x > 5 && z <= 5) (rnd() > 0.4 ? broadleafs : pines).push(tree)
      else (rnd() > 0.55 ? broadleafs : shrubs).push({ ...tree, scale: tree.scale * 0.84 })
    }
    return { pineList: pines, broadleafList: broadleafs, riverTreeList: riverTrees, shrubList: shrubs }
  }, [clearedZones])

  const allFallbackTrees = [...lists.pineList, ...lists.broadleafList, ...lists.riverTreeList, ...lists.shrubList]
  return (
    <AssetErrorBoundary fallback={<ProceduralFallback lists={allFallbackTrees} />}>
      <Suspense fallback={<ProceduralFallback lists={allFallbackTrees} />}>
        <LoadedVegetation {...lists} />
      </Suspense>
    </AssetErrorBoundary>
  )
}

Object.values(TREE_ASSETS).forEach((url) => useGLTF.preload(url))
