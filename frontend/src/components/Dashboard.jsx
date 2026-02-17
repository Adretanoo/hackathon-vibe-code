import React, { useState, useEffect } from 'react';

// Transport Type Emojis
const getTransportEmoji = (type) => {
    const emojiMap = {
        'Walker': '🚶',
        'Bicycle': '🚲',
        'Car': '🚗'
    };
    return emojiMap[type] || '❓';
};

const getTransportCapacity = (type) => {
    const capacityMap = {
        'Walker': 5,
        'Bicycle': 15,
        'Car': 50
    };
    return capacityMap[type] || 0;
};

export default function Dashboard() {
    const [couriers, setCouriers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [orderQueue, setOrderQueue] = useState([]);
    const [obstacles, setObstacles] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);

    // MVP Stage 1 State
    const [mvpCoords, setMvpCoords] = useState({ x: 30, y: 30 });
    const [mvpWeight, setMvpWeight] = useState(1);
    const [orderWeight, setOrderWeight] = useState(1);
    const [tempRestaurant, setTempRestaurant] = useState(null);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/state');
            const data = await response.json();
            setCouriers(data.couriers);
            setOrders(data.orders);
            setOrderQueue(data.orderQueue || []);
            setObstacles(data.obstacles || []);
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

    const addOrder = async () => {
        try {
            await fetch('http://localhost:3001/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight: orderWeight })
            });
            fetchData();
        } catch (error) {
            console.error('Error adding order:', error);
        }
    };

    const completeCourierOrder = async (courierId) => {
        try {
            const res = await fetch(`http://localhost:3001/api/couriers/${courierId}/complete-order`, {
                method: 'POST'
            });
            const result = await res.json();
            if (result.success) {
                fetchData();
                if (result.autoAssigned) {
                    setErrorMsg(`✅ Courier ${courierId} completed order! Auto-assigned: ${result.autoAssigned}`);
                } else {
                    setErrorMsg(`✅ Courier ${courierId} completed order! (${result.completedOrdersToday} today)`);
                }
                setTimeout(() => setErrorMsg(null), 3000);
            }
        } catch (error) {
            console.error('Error completing order:', error);
            setErrorMsg("Error completing order");
            setTimeout(() => setErrorMsg(null), 3000);
        }
    };

    const handleMvpFind = async () => {
        setErrorMsg(null);
        try {
            const res = await fetch('http://localhost:3001/api/stage1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    x: mvpCoords.x,
                    y: mvpCoords.y,
                    weight: mvpWeight
                })
            });
            const result = await res.json();

            if (result.status && result.status.includes("No")) {
                setErrorMsg(result.status);
                setTimeout(() => setErrorMsg(null), 4000);
            } else if (result.assignedCourier) {
                setTempRestaurant({ x: mvpCoords.x, y: mvpCoords.y });
                fetchData();
                alert(`Assigned Courier ${result.assignedCourier.id} [${result.assignedCourier.transportType}] (Distance: ${result.assignedCourier.distance.toFixed(1)})`);
            }
        } catch (e) {
            console.error(e);
            setErrorMsg("Network error. Please try again.");
            setTimeout(() => setErrorMsg(null), 3000);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <div className="w-96 bg-white shadow-lg flex flex-col p-6 space-y-4 overflow-y-auto">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dispatch Core</h1>
                    <p className="text-sm text-gray-500">Stage 3: Priorities & Queues</p>
                </div>

                {/* Error/Success Toast */}
                {errorMsg && (
                    <div className={`border-l-4 p-4 rounded ${errorMsg.includes('✅') ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'} animate-pulse`}>
                        <p className="text-sm font-medium">{errorMsg}</p>
                    </div>
                )}

                {/* Controls */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</h2>
                    <div className="flex space-x-2">
                        <button onClick={addCourier} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow transition">
                            + Courier
                        </button>
                    </div>

                    {/* Order with Weight */}
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                        <label className="text-xs text-gray-600 block mb-1">Order Weight (kg)</label>
                        <div className="flex space-x-2">
                            <input
                                type="number"
                                min="1"
                                max="100"
                                className="flex-1 border border-green-300 p-2 rounded"
                                value={orderWeight}
                                onChange={(e) => setOrderWeight(parseInt(e.target.value) || 1)}
                            />
                            <button onClick={addOrder} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded shadow transition">
                                + Order
                            </button>
                        </div>
                    </div>
                </div>

                {/* MVP Stage 1 Box */}
                <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <h3 className="text-purple-800 font-bold text-sm mb-2">MVP: Find Nearest</h3>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                            <label className="text-xs text-gray-600">X</label>
                            <input
                                type="number"
                                className="w-full border p-1 rounded text-sm"
                                value={mvpCoords.x}
                                onChange={(e) => setMvpCoords({ ...mvpCoords, x: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">Y</label>
                            <input
                                type="number"
                                className="w-full border p-1 rounded text-sm"
                                value={mvpCoords.y}
                                onChange={(e) => setMvpCoords({ ...mvpCoords, y: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">Weight</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full border p-1 rounded text-sm"
                                value={mvpWeight}
                                onChange={(e) => setMvpWeight(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>
                    <button onClick={handleMvpFind} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1 px-3 rounded text-sm transition">
                        Find & Assign
                    </button>
                </div>

                {/* Courier List */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Couriers ({couriers.length})</h3>
                    <ul className="space-y-2">
                        {couriers.map(c => (
                            <li key={c.id} className="p-3 bg-gray-50 rounded border hover:bg-gray-100 transition">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.isBusy ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                        <div>
                                            <div className="font-medium text-gray-800 text-sm">{c.id}</div>
                                            <div className="text-xs text-gray-500">({c.x}, {c.y})</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg leading-none">{getTransportEmoji(c.transportType)}</div>
                                        <div className="text-xs text-gray-600 mt-1">{c.transportType}</div>
                                        <div className="text-xs text-gray-500">≤{getTransportCapacity(c.transportType)}kg</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-xs text-gray-600">Today: {c.completedOrdersToday || 0}</span>
                                    {c.isBusy && (
                                        <button
                                            onClick={() => completeCourierOrder(c.id)}
                                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 rounded transition"
                                        >
                                            Complete
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Order Queue */}
                {orderQueue.length > 0 && (
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-300">
                        <h3 className="text-yellow-800 font-bold text-sm mb-2">📋 Order Queue ({orderQueue.length})</h3>
                        <ul className="space-y-1">
                            {orderQueue.map(order => (
                                <li key={order.id} className="text-xs flex justify-between items-center bg-white p-2 rounded border border-yellow-200">
                                    <span className="font-medium">{order.id}</span>
                                    <span className="text-gray-600">{order.weight}kg</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
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
                                <rect x={order.pickupX - 1} y={order.pickupY - 1} width="2" height="2" fill="#22c55e" rx="0.5" />
                                <text x={order.pickupX} y={order.pickupY - 2} fontSize="2.5" fill="#15803d" textAnchor="middle">P</text>
                                <text x={order.pickupX} y={order.pickupY + 3.5} fontSize="1.8" fill="#15803d" textAnchor="middle">{order.weight}kg</text>

                                <rect x={order.dropX - 1} y={order.dropY - 1} width="2" height="2" fill="#f97316" rx="0.5" />
                                <text x={order.dropX} y={order.dropY + 3} fontSize="2.5" fill="#c2410c" textAnchor="middle">D</text>

                                {order.status === 'ASSIGNED' && (
                                    <line x1={order.pickupX} y1={order.pickupY} x2={order.dropX} y2={order.dropY} stroke="#22c55e" strokeDasharray="1" strokeWidth="0.3" opacity="0.6" />
                                )}
                            </g>
                        ))}

                        {/* Couriers */}
                        {couriers.map(c => {
                            const emoji = getTransportEmoji(c.transportType);
                            return (
                                <g key={c.id} style={{ transition: 'all 0.5s ease' }}>
                                    <circle cx={c.x} cy={c.y} r="1.5" fill={c.isBusy ? "#ef4444" : "#3b82f6"} stroke="white" strokeWidth="0.2" />
                                    <text x={c.x} y={c.y - 2.5} fontSize="2" fill="#1f2937" textAnchor="middle" fontWeight="bold">{c.id}</text>
                                    <text x={c.x} y={c.y + 4} fontSize="2.5" textAnchor="middle">{emoji}</text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Overlay Info */}
                    <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded text-xs shadow text-gray-600">
                        <p>Map Size: 100x100</p>
                        <p>Queue: {orderQueue.length}</p>
                        <p className="mt-1 pt-1 border-t border-gray-300">
                            🚶 Walker ≤5kg | 🚲 Bicycle ≤15kg | 🚗 Car ≤50kg
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
