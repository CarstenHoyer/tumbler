import {
  MeshTransmissionMaterial,
  OrbitControls,
  OrthographicCamera,
  Text3D,
  useHelper,
  useMatcapTexture,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Environment } from "@react-three/drei";
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  DirectionalLightHelper,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshMatcapMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  NormalBufferAttributes,
  Object3D,
  Object3DEventMap,
  PointLight,
  PointLightHelper,
  Vector3,
} from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry, SimplexNoise } from "three-stdlib";
import {
  ColliderShape,
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  Physics,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { Attractor } from "@react-three/rapier-addons";

const simplex = new SimplexNoise();

const COUNT = 10;
const fontSize = 1;
const fontDepth = 0.5;
const fontDist = 1.5;
const rowDepth = 0.15;
const attractorStrength = 200;
const rigidBodyShape: ColliderShape = undefined;

const createInstances = (char: string, offset: number, count: number) => {
  const instances: InstancedRigidBodyProps[] = [];

  for (let i = 0; i < count; i++) {
    instances.push({
      key: "instance_" + char + "_" + Math.random(),
      position: [-offset + fontDist, 0, -rowDepth * 5 + -i * rowDepth],
      rotation: [0, 0, 0],
      linearVelocity: [0, 0, 0],
      angularVelocity: [0, 0, 0],
      angularDamping: 10.0,
      linearDamping: 10.0,
      density: Math.random() * 60.0 + 60,
      // friction: 10,
    });
  }

  return instances;
};

function Curve({ curve }) {
  const points = curve.getPoints(50);
  const geometry = new BufferGeometry().setFromPoints(points);
  const material = new LineBasicMaterial({ color: 0xff0000 });

  return <mesh geometry={geometry} material={material} />;
}
const Scene = () => {
  const lastActionTime = useRef<number>(0);
  const lastCurveOffsetRef = useRef<number>(0);
  const pointLightRef = useRef<PointLight>(null);
  // @ts-ignore
  useHelper(pointLightRef, PointLightHelper, 1, "red");
  const attractorGroupRef = useRef<Group>(null);

  const {
    viewport: { width, height },
  } = useThree();

  let curve = useMemo(() => {
    let points = [
      new Vector3(width, height, 0),
      new Vector3(width, -height, 0),
      new Vector3(-width, -height, 0),
      new Vector3(-width, height, 0),
      new Vector3(width, height, 0),
    ];
    return new CatmullRomCurve3(points);
  }, [width, height]);

  const material = new MeshPhongMaterial({ color: "white" });

  const rigidBodiesA1 = useRef<RapierRigidBody[]>(null);
  const rigidBodiesK = useRef<RapierRigidBody[]>(null);
  const rigidBodiesQ = useRef<RapierRigidBody[]>(null);
  const rigidBodiesA2 = useRef<RapierRigidBody[]>(null);

  const [a, setA] = useState<BufferGeometry | null>(null);
  const [k, setK] = useState<BufferGeometry | null>(null);
  const [q, setQ] = useState<BufferGeometry | null>(null);

  const loader = new FontLoader();

  const instancesA1 = useMemo(
    () => createInstances("a1", 1 * fontDist, COUNT), //Math.floor(COUNT * 0.5)),
    []
  );
  const instancesK = useMemo(
    () => createInstances("k", 1 * fontDist, COUNT),
    []
  );
  const instancesQ = useMemo(
    () => createInstances("q", 1 * fontDist, COUNT),
    []
  );
  const instancesA2 = useMemo(
    () => createInstances("a2", 1 * fontDist, COUNT), //Math.floor(COUNT * 0.5)),
    []
  );

  useEffect(() => {
    loader.load("/fonts/Roboto Black_Regular.json", (font) => {
      const textConfig = {
        font: font,
        size: fontSize,
        height: fontDepth,
        curveSegments: 12,
        bevelEnabled: true,
        bevelSize: 0.05,
        bevelThickness: 0.05,
      };

      setA(new TextGeometry("A", textConfig));

      setK(new TextGeometry("K", textConfig));

      setQ(new TextGeometry("Q", textConfig));
    });
  }, []);

  useFrame(({ clock }) => {
    // if (clock.elapsedTime - lastActionTime.current > 0.1) {
    lastActionTime.current = clock.elapsedTime;
    let t = simplex.noise(clock.elapsedTime / 20, clock.elapsedTime / 20) / 300;

    let newCurveOffset = lastCurveOffsetRef.current + t;
    if (newCurveOffset < 0) newCurveOffset = 1 + newCurveOffset;
    if (newCurveOffset > 1) newCurveOffset = newCurveOffset - 1;

    lastCurveOffsetRef.current = newCurveOffset;
    let point = curve.getPoint(newCurveOffset);

    attractorGroupRef.current?.children?.[0]?.position.set(
      point.x,
      point.y,
      attractorGroupRef.current?.children?.[0]?.position.z
    );
    // }
  });

  return (
    <>
      <Curve curve={curve} />
      <pointLight
        ref={pointLightRef}
        castShadow={true}
        position={[width, height / 2, 10]}
        intensity={1000}
      />
      <group>
        {a ? (
          <InstancedRigidBodies ref={rigidBodiesA1} instances={instancesA1}>
            <instancedMesh
              receiveShadow={true}
              // args={[a, undefined, Math.floor(COUNT * 0.5)]}
              args={[a, undefined, COUNT]}
              // count={Math.floor(COUNT * 0.5)}
              count={COUNT}
            >
              <MeshTransmissionMaterial
                backside
                samples={4}
                thickness={3}
                chromaticAberration={0.025}
                anisotropy={0.1}
                distortion={0.1}
                distortionScale={0.1}
                temporalDistortion={0.2}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
              />
            </instancedMesh>
          </InstancedRigidBodies>
        ) : null}
        {k ? (
          <InstancedRigidBodies ref={rigidBodiesK} instances={instancesK}>
            <instancedMesh
              receiveShadow={true}
              args={[k, undefined, COUNT]}
              count={COUNT}
            >
              <MeshTransmissionMaterial
                backside
                samples={4}
                thickness={3}
                chromaticAberration={0.025}
                anisotropy={0.1}
                distortion={0.1}
                distortionScale={0.1}
                temporalDistortion={0.2}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
              />
            </instancedMesh>
          </InstancedRigidBodies>
        ) : null}
        {q ? (
          <InstancedRigidBodies ref={rigidBodiesQ} instances={instancesQ}>
            <instancedMesh
              receiveShadow={true}
              args={[q, undefined, COUNT]}
              count={COUNT}
            >
              <MeshTransmissionMaterial
                backside
                samples={4}
                thickness={3}
                chromaticAberration={0.025}
                anisotropy={0.1}
                distortion={0.1}
                distortionScale={0.1}
                temporalDistortion={0.2}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
              />
            </instancedMesh>
          </InstancedRigidBodies>
        ) : null}
        {a ? (
          <InstancedRigidBodies ref={rigidBodiesA2} instances={instancesA2}>
            <instancedMesh
              receiveShadow={true}
              // args={[a, material, Math.floor(COUNT * 0.5)]}
              args={[a, undefined, COUNT]}
              // count={Math.floor(COUNT * 0.5)}
              count={COUNT}
            >
              <MeshTransmissionMaterial
                backside
                samples={4}
                thickness={3}
                chromaticAberration={0.025}
                anisotropy={0.1}
                distortion={0.1}
                distortionScale={0.1}
                temporalDistortion={0.2}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
              />
            </instancedMesh>
          </InstancedRigidBodies>
        ) : null}

        <RigidBody colliders="hull" includeInvisible type="fixed">
          {/* back */}
          <mesh position={[0, 0, -46]}>
            <boxGeometry args={[width, height, 2]} />
            <meshBasicMaterial color="red" transparent opacity={0} />
          </mesh>

          {/* front */}
          <mesh position={[0, 0, 0.5]}>
            <boxGeometry args={[width, height, 2]} />
            <meshBasicMaterial color="red" transparent opacity={0} />
          </mesh>

          {/* right */}
          <mesh position={[width / 2 + 0.5, 0, -46 / 2]}>
            <boxGeometry args={[2, height, 47]} />
            <meshBasicMaterial color="red" transparent opacity={0} />
          </mesh>

          {/* left */}
          <mesh position={[-width / 2 - 0.5, 0, -46 / 2]}>
            <boxGeometry args={[2, height, 47]} />
            <meshBasicMaterial color="red" transparent opacity={0} />
          </mesh>

          {/* top */}
          <mesh position={[0, height / 2 + 0.5, -46 / 2]}>
            <boxGeometry args={[width, 2, 46]} />
            <meshBasicMaterial color="red" transparent opacity={0} />
          </mesh>

          {/* bottom */}
          <mesh position={[0, -height / 2 - 0.5, -46 / 2]}>
            <boxGeometry args={[width, 2, 46]} />
            <meshBasicMaterial color="red" transparent opacity={0} />
          </mesh>
        </RigidBody>

        <group ref={attractorGroupRef}>
          <Attractor
            range={200}
            strength={attractorStrength}
            position={[0, -height, 10]}
          />
        </group>
      </group>
    </>
  );
};

const Box = () => {
  const {
    viewport: { width, height },
  } = useThree();
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[width, height, 1]} />
      <meshBasicMaterial color="transparent opacity={0}" />
    </mesh>
  );
};

const App = () => {
  return (
    <Canvas
      shadows={true}
      // camera={{ position: [0, 0, 2] }}
      // camera={{ position: [0, 0, 0] }}
      orthographic
      camera={{ zoom: 102, position: [0, 0, 100] }}
      style={{ backgroundColor: "black" }}
    >
      <OrbitControls />
      <ambientLight castShadow={true} />
      <Environment preset="forest" />
      <Suspense>
        {/* <Box /> */}
        <Physics gravity={[0, 0, 0]}>
          <Scene />
        </Physics>
      </Suspense>
    </Canvas>
  );
};

export default App;
