import React, { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial, Float, Stars as DreiStars } from '@react-three/drei'
import * as random from 'maath/random/dist/maath-random.esm'
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'

// 1. 3D STARFIELD COMPONENT
function Starfield(props) {
  const ref = useRef()
  // Generate 5000 random points in a sphere
  const [sphere] = useState(() => random.inSphere(new Float32Array(5000), { radius: 1.5 }))
  
  useFrame((state, delta) => {
    // Subtle rotation of the universe
    ref.current.rotation.x -= delta / 10
    ref.current.rotation.y -= delta / 15
  })

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#ffa0e0"
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  )
}

// 2. MAIN APP COMPONENT
export default function App() {
  const [status, setStatus] = useState('Select an Echo Tier')
  const [loading, setLoading] = useState(false)

  // REPLACE with your wallet address
  const MY_WALLET = "2BL8QZqU5ax7p7WUvRaWbk14bKp9HTsU75BhhYorcuqt"

  const handleTransaction = async (amount) => {
    try {
      setLoading(true)
      setStatus('Connecting to Wallet...')
      
      const { solana } = window
      if (!solana) return alert('Solana wallet not found!')

      const response = await solana.connect()
      const publicKey = response.publicKey
      
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed")
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(MY_WALLET),
          lamports: amount * 1000000000,
        })
      )

      transaction.feePayer = publicKey
      let { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      const { signature } = await solana.signAndSendTransaction(transaction)
      setStatus(`Success! Sig: ${signature.slice(0, 8)}...`)
    } catch (err) {
      console.error(err)
      setStatus('Transaction Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {/* 3D LAYER */}
      <Canvas camera={{ position: [0, 0, 1] }}>
        <ambientLight intensity={0.5} />
        <Starfield />
        <DreiStars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>

      /* GLASSMORPHIC UI LAYER */
      <div className="glass-container" style={{
        position: 'absolute', top: '50%', left: '50%', 
        transform: 'translate(-50%, -50%)', textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Eternal Echo</h1>
        <p style={{ opacity: 0.8 }}>{status}</p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => handleTransaction(0.001)} disabled={loading}>Standard</button>
          <button onClick={() => handleTransaction(0.04)} className="btn-premium" disabled={loading}>Premium</button>
          <button onClick={() => handleTransaction(0.2)} className="btn-legendary" disabled={loading}>LEGENDARY</button>
        </div>
      </div>
    </div>
  )
}
