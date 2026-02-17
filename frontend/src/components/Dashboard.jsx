import React, { useState, useEffect } from 'react';

// Icons (Simple SVGs)
const CourierIcon = ({ busy }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={busy ? "red" : "#3b82f6"} className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" fontSize="10" textAnchor="middle" fill="white" fontWeight="bold">C</text>
    </svg>
);

const OrderIcon = ({ type }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={type === 'pickup' ? "#22c55e" : "#f97316"} className="w-5 h-5">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <text x="12" y="16" fontSize="10" textAnchor="middle" fill="white" fontWeight="bold">
            {type === 'pickup' ? 'P' : 'D'}
        </text>
    </svg>
);

export default function Dashboard() {
    const [couriers, setCouriers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [obstacles, setObstacles] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);

    // MVP Stage 1 State
    const [mvpCoords, setMvpCoords] = useState({ x: 30, y: 30 });
    const [tempRestaurant, setTempRestaurant] = useState(null);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/state');
            const data = await response.json();
            setCouriers(data.couriers);
            setOrders(data.orders);
            setObstacles(data.obstacles || []); // array of "x,y" strings
        } catch (error) {
            console.error('Error fetching state:', error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, []);

    // Action Handlers
    const addCourier = async () => fetch('http://localhost:3001/api/couriers', { method: 'POST' });
    const addOrder = async () => fetch('http://localhost:3001/api/orders', { method: 'POST' });

    const handleMvpFind = async () => {
        setErrorMsg(null);
        try {
            const res = await fetch('http://localhost:3001/api/stage1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: mvpCoords.x, y: mvpCoords.y })
            });
            const result = await res.json();

            if (result.status === "No couriers available") {
                setErrorMsg("No couriers available! Please add more couriers.");
                // Set timer to clear error
                setTimeout(() => setErrorMsg(null), 3000);
            } else if (result.assignedCourier) {
                setTempRestaurant({ x: mvpCoords.x, y: mvpCoords.y });
                // Force refresh
                fetchData();
                alert(`Assigned Courier ${result.assignedCourier.id} (Distance: ${result.assignedCourier.distance.toFixed(1)})`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <div className="w-80 bg-white shadow-lg flex flex-col p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dispatch Core</h1>
                    <p className="text-sm text-gray-500">Stage 2: A* & Pathfinding</p>
                </div>

                {/* Error Toast */}
                {errorMsg && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded animate-pulse">
                        <p className="font-bold">Error</p>
                        <p>{errorMsg}</p>
                    </div>
                )}

                {/* Controls */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</h2>
                    <div className="flex space-x-2">
                        <button onClick={addCourier} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow transition">
                            + Courier
                        </button>
                        <button onClick={addOrder} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded shadow transition">
                            + Order
                        </button>
                    </div>
                </div>

                {/* MVP Stage 1 Box */}
                <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <h3 className="text-purple-800 font-bold text-sm mb-2">MVP: Find Nearest</h3>
                    <div className="flex space-x-2 mb-2">
                        <div>
                            <label className="text-xs text-gray-600">X</label>
                            <input
                                type="number"
                                className="w-full border p-1 rounded"
                                value={mvpCoords.x}
                                onChange={(e) => setMvpCoords({ ...mvpCoords, x: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">Y</label>
                            <input
                                type="number"
                                className="w-full border p-1 rounded"
                                value={mvpCoords.y}
                                onChange={(e) => setMvpCoords({ ...mvpCoords, y: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <button onClick={handleMvpFind} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1 px-3 rounded text-sm transition">
                        Find & Assign
                    </button>
                </div>

                {/* Stats / List */}
                <div className="flex-1 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Couriers ({couriers.length})</h3>
                    <ul className="space-y-2">
                        {couriers.map(c => (
                            <li key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                <div className="flex items-center space-x-2">
                                    <span className={`w-2 h-2 rounded-full ${c.isBusy ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                    <span className="font-medium text-gray-700">{c.id}</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    ({c.x}, {c.y})
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Main Map Area */}
            <div className="flex-1 p-8 flex justify-center items-center bg-gray-200 overflow-hidden">
                <div className="relative bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-300" style={{ width: '600px', height: '600px' }}>
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                        {/* Grid Pattern */}
                        <defs>
                            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#smallGrid)" />

                        {/* Obstacles */}
                        {obstacles.map(obs => {
                            const [x, y] = obs.split(',').map(Number);
                            return <rect key={obs} x={x} y={y} width="1" height="1" fill="#6b7280" opacity="0.8" />;
                        })}

                        {/* Temp Restaurant */}
                        {tempRestaurant && (
                            <g>
                                <rect x={tempRestaurant.x - 1.5} y={tempRestaurant.y - 1.5} width="3" height="3" className="fill-purple-500 animate-pulse" rx="0.5" />
                                <text x={tempRestaurant.x} y={tempRestaurant.y - 2} fontSize="3" fill="#7e22ce" textAnchor="middle" fontWeight="bold">REST</text>
                            </g>
                        )}

                        {/* Orders */}
                        {orders.filter(o => o.status !== 'DELIVERED').map(order => (
                            <g key={order.id}>
                                {/* Pickup */}
                                <rect x={order.pickupX - 1} y={order.pickupY - 1} width="2" height="2" fill="#22c55e" rx="0.5" />
                                <text x={order.pickupX} y={order.pickupY - 2} fontSize="2.5" fill="#15803d" textAnchor="middle">P</text>

                                {/* Drop */}
                                <rect x={order.dropX - 1} y={order.dropY - 1} width="2" height="2" fill="#f97316" rx="0.5" />
                                <text x={order.dropX} y={order.dropY + 3} fontSize="2.5" fill="#c2410c" textAnchor="middle">D</text>

                                {/* Line */}
                                {order.status === 'ASSIGNED' && (
                                    <line x1={order.pickupX} y1={order.pickupY} x2={order.dropX} y2={order.dropY} stroke="#22c55e" strokeDasharray="1" strokeWidth="0.3" opacity="0.6" />
                                )}
                            </g>
                        ))}

                        {/* Couriers */}
                        {couriers.map(c => (
                            <g key={c.id} style={{ transition: 'all 0.5s ease' }}>
                                <circle cx={c.x} cy={c.y} r="1.5" fill={c.isBusy ? "#ef4444" : "#3b82f6"} stroke="white" strokeWidth="0.2" />
                                <text x={c.x} y={c.y - 2.5} fontSize="2" fill="#1f2937" textAnchor="middle" fontWeight="bold">{c.id}</text>
                            </g>
                        ))}
                    </svg>

                    {/* Overlay Info */}
                    <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded text-xs shadow text-gray-600">
                        <p>Map Size: 100x100</p>
                        <p>Obstacles: {obstacles.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
