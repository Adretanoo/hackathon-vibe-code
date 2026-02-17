import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';

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
    const [loading, setLoading] = useState(false);

    // Animation state - stores animating couriers separately
    const [animatingCouriers, setAnimatingCouriers] = useState({});
    const animationTimers = useRef({});

    // MVP Stage 1 State
    const [mvpCoords, setMvpCoords] = useState({ x: 30, y: 30 });
    const [mvpWeight, setMvpWeight] = useState(1);
    const [orderWeight, setOrderWeight] = useState(1);
    const [tempRestaurant, setTempRestaurant] = useState(null);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/state');
            const data = await response.json();

            // Merge server couriers with animating positions
            const mergedCouriers = data.couriers.map(c => {
                if (animatingCouriers[c.id]) {
                    return { ...c, x: animatingCouriers[c.id].x, y: animatingCouriers[c.id].y };
                }
                return c;
            });

            setCouriers(mergedCouriers);
            setOrders(data.orders);
            setOrderQueue(data.orderQueue || []);
            setObstacles(data.obstacles || []);
        } catch (error) {
            console.error('Error fetching state:', error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [animatingCouriers]);

    // Cleanup animation timers on unmount
    useEffect(() => {
        return () => {
            Object.values(animationTimers.current).forEach(clearTimeout);
        };
    }, []);

    // Animate courier movement along path
    const animateCourierMovement = (courierId, path) => {
        if (!path || path.length <= 1) return;

        // Clear any existing animation for this courier
        if (animationTimers.current[courierId]) {
            clearTimeout(animationTimers.current[courierId]);
        }

        let currentStep = 0;

        const moveStep = () => {
            if (currentStep < path.length) {
                const position = path[currentStep];

                setAnimatingCouriers(prev => ({
                    ...prev,
                    [courierId]: { x: position.x, y: position.y }
                }));

                currentStep++;

                if (currentStep < path.length) {
                    animationTimers.current[courierId] = setTimeout(moveStep, 300); // 300ms per step
                } else {
                    // Animation complete - remove from animatingCouriers
                    setTimeout(() => {
                        setAnimatingCouriers(prev => {
                            const newState = { ...prev };
                            delete newState[courierId];
                            return newState;
                        });
                        fetchData(); // Final sync
                    }, 300);
                }
            }
        };

        moveStep();
    };

    // Action Handlers
    const addCourier = async () => {
        setLoading(true);
        try {
            await fetch('http://localhost:3001/api/couriers', { method: 'POST' });
            await fetchData();
            toast.success('✅ New courier added!');
        } catch (error) {
            toast.error('Failed to add courier');
        } finally {
            setLoading(false);
        }
    };

    const addOrder = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight: orderWeight })
            });
            const order = await res.json();
            await fetchData();

            // Try to assign immediately
            const assignRes = await fetch(`http://localhost:3001/api/assign/${order.id}`, {
                method: 'POST'
            });
            const assignResult = await assignRes.json();

            if (assignResult.queued) {
                toast('📋 Order queued - no suitable courier available', {
                    icon: '⏳',
                    style: {
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '2px solid #f59e0b'
                    }
                });
            } else if (assignResult.success && assignResult.courier) {
                toast.success(`🎯 Order assigned to ${assignResult.courier.id}!`);

                // Start animation if path provided
                if (assignResult.path && assignResult.path.length > 1) {
                    animateCourierMovement(assignResult.courier.id, assignResult.path);
                }
            }

            await fetchData();
        } catch (error) {
            toast.error('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    const completeCourierOrder = async (courierId) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/api/couriers/${courierId}/complete-order`, {
                method: 'POST'
            });
            const result = await res.json();

            if (result.success) {
                await fetchData();

                if (result.autoAssigned) {
                    toast.success(
                        `🎉 ${courierId} completed delivery!\n🚀 Auto-assigned: ${result.autoAssigned}`,
                        { duration: 4000 }
                    );
                } else {
                    toast.success(
                        `✅ ${courierId} completed delivery!\n📊 Total today: ${result.completedOrdersToday}`,
                        { duration: 3000 }
                    );
                }
            }
        } catch (error) {
            console.error('Error completing order:', error);
            toast.error('Failed to complete order');
        } finally {
            setLoading(false);
        }
    };

    const handleMvpFind = async () => {
        setLoading(true);
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
                toast.error(result.status, {
                    duration: 4000,
                    icon: '⚠️'
                });
            } else if (result.assignedCourier) {
                setTempRestaurant({ x: mvpCoords.x, y: mvpCoords.y });
                await fetchData();
                toast.success(
                    `${getTransportEmoji(result.assignedCourier.transportType)} ${result.assignedCourier.id} assigned!\nDistance: ${result.assignedCourier.distance.toFixed(1)} units`,
                    { duration: 3000 }
                );
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 font-sans">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                        fontWeight: '500',
                        borderRadius: '8px',
                        padding: '16px'
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />

            {/* Sidebar */}
            <div className="w-96 bg-white shadow-2xl flex flex-col p-6 space-y-4 overflow-y-auto border-r-2 border-gray-300">
                <div className="pb-4 border-b-2 border-gray-200">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Dispatch Core</h1>
                    <p className="text-sm text-gray-500 mt-1">🎬 Animated Movement</p>
                </div>

                {/* Controls */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</h2>
                    <button
                        onClick={addCourier}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg shadow-md transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        + Add Courier
                    </button>

                    {/* Order with Weight */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200 shadow-sm">
                        <label className="text-xs font-bold text-gray-700 block mb-2 uppercase tracking-wide">Order Weight (kg)</label>
                        <div className="flex space-x-2">
                            <input
                                type="number"
                                min="1"
                                max="100"
                                className="flex-1 border-2 border-green-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                                value={orderWeight}
                                onChange={(e) => setOrderWeight(parseInt(e.target.value) || 1)}
                            />
                            <button
                                onClick={addOrder}
                                disabled={loading}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-5 rounded-lg shadow-md transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                            >
                                + Order
                            </button>
                        </div>
                    </div>
                </div>

                {/* MVP Stage 1 Box */}
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border-2 border-purple-200 shadow-sm">
                    <h3 className="text-purple-800 font-bold text-sm mb-3 uppercase tracking-wide">🎯 MVP: Find Nearest</h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                            <label className="text-xs text-gray-600 font-semibold">X</label>
                            <input
                                type="number"
                                className="w-full border-2 border-purple-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={mvpCoords.x}
                                onChange={(e) => setMvpCoords({ ...mvpCoords, x: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 font-semibold">Y</label>
                            <input
                                type="number"
                                className="w-full border-2 border-purple-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={mvpCoords.y}
                                onChange={(e) => setMvpCoords({ ...mvpCoords, y: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 font-semibold">kg</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full border-2 border-purple-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={mvpWeight}
                                onChange={(e) => setMvpWeight(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleMvpFind}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white py-2 px-3 rounded-lg text-sm transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md"
                    >
                        Find & Assign
                    </button>
                </div>

                {/* Order Queue */}
                {orderQueue.length > 0 && (
                    <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-lg border-2 border-yellow-400 shadow-lg animate-pulse">
                        <h3 className="text-amber-900 font-bold text-sm mb-3 flex items-center">
                            <span className="text-2xl mr-2">📋</span>
                            Order Queue ({orderQueue.length})
                        </h3>
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {orderQueue.map(order => (
                                <li key={order.id} className="flex justify-between items-center bg-white p-3 rounded-lg border-2 border-yellow-300 shadow-sm">
                                    <span className="font-bold text-gray-700">{order.id}</span>
                                    <span className="bg-yellow-200 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                                        {order.weight}kg
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Courier List */}
                <div className="flex-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                        Couriers ({couriers.length})
                    </h3>
                    <ul className="space-y-2">
                        {couriers.map(c => (
                            <li key={c.id} className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${c.isBusy ? 'bg-red-500 animate-pulse' : 'bg-green-500'} shadow-lg`}></span>
                                        <div>
                                            <div className="font-bold text-gray-800 flex items-center">
                                                {c.id}
                                                {animatingCouriers[c.id] && (
                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse">Moving</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">({c.x}, {c.y})</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl leading-none">{getTransportEmoji(c.transportType)}</div>
                                        <div className="text-xs text-gray-600 mt-1 font-semibold">{c.transportType}</div>
                                        <div className="text-xs text-gray-500">≤{getTransportCapacity(c.transportType)}kg</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-gray-200">
                                    <span className="text-xs font-bold text-gray-600">
                                        📊 Today: <span className="text-blue-600">{c.completedOrdersToday || 0}</span>
                                    </span>
                                    {c.isBusy && (
                                        <button
                                            onClick={() => completeCourierOrder(c.id)}
                                            disabled={loading}
                                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs py-2 px-3 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md"
                                        >
                                            ✓ Complete
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Main Map Area */}
            <div className="flex-1 p-8 flex justify-center items-center overflow-hidden">
                <div className="relative bg-white shadow-2xl rounded-2xl overflow-hidden border-4 border-gray-300" style={{ width: '650px', height: '650px' }}>
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                        {/* Grid Pattern */}
                        <defs>
                            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                            </pattern>
                            <pattern id="largeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d1d5db" strokeWidth="0.8" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#smallGrid)" />
                        <rect width="100" height="100" fill="url(#largeGrid)" />

                        {/* Obstacles */}
                        {obstacles.map(obs => {
                            const [x, y] = obs.split(',').map(Number);
                            return <rect key={obs} x={x} y={y} width="1" height="1" fill="#4b5563" opacity="0.9" stroke="#1f2937" strokeWidth="0.1" />;
                        })}

                        {/* Temp Restaurant */}
                        {tempRestaurant && (
                            <g>
                                <rect x={tempRestaurant.x - 1.5} y={tempRestaurant.y - 1.5} width="3" height="3" className="fill-purple-600 animate-pulse" rx="0.5" stroke="white" strokeWidth="0.2" />
                                <text x={tempRestaurant.x} y={tempRestaurant.y - 2.5} fontSize="2.5" fill="#7e22ce" textAnchor="middle" fontWeight="bold">🏪</text>
                            </g>
                        )}

                        {/* Orders */}
                        {orders.filter(o => o.status !== 'DELIVERED').map(order => (
                            <g key={order.id}>
                                <rect x={order.pickupX - 1.2} y={order.pickupY - 1.2} width="2.4" height="2.4" fill="#10b981" rx="0.5" stroke="white" strokeWidth="0.2" />
                                <text x={order.pickupX} y={order.pickupY - 2.5} fontSize="2.5" fill="#065f46" textAnchor="middle" fontWeight="bold">P</text>
                                <text x={order.pickupX} y={order.pickupY + 4} fontSize="1.8" fill="#065f46" textAnchor="middle" fontWeight="bold">{order.weight}kg</text>

                                <rect x={order.dropX - 1.2} y={order.dropY - 1.2} width="2.4" height="2.4" fill="#f97316" rx="0.5" stroke="white" strokeWidth="0.2" />
                                <text x={order.dropX} y={order.dropY + 3.5} fontSize="2.5" fill="#9a3412" textAnchor="middle" fontWeight="bold">D</text>

                                {order.status === 'ASSIGNED' && (
                                    <line x1={order.pickupX} y1={order.pickupY} x2={order.dropX} y2={order.dropY} stroke="#10b981" strokeDasharray="1" strokeWidth="0.4" opacity="0.7" />
                                )}
                            </g>
                        ))}

                        {/* Couriers - WITH ANIMATION */}
                        {couriers.map(c => {
                            const emoji = getTransportEmoji(c.transportType);
                            const color = c.isBusy ? "#ef4444" : "#10b981";
                            const isAnimating = animatingCouriers[c.id];

                            return (
                                <g key={c.id} className={isAnimating ? "courier-animating" : ""}>
                                    {/* Glow effect - larger when animating */}
                                    <circle cx={c.x} cy={c.y} r={isAnimating ? "3" : "2.5"} fill={color} opacity="0.3" className="transition-all duration-300" />
                                    {/* Main circle */}
                                    <circle cx={c.x} cy={c.y} r="2" fill={color} stroke="white" strokeWidth="0.3" className="transition-all duration-300" />
                                    {/* ID Label */}
                                    <text x={c.x} y={c.y - 3.5} fontSize="2.2" fill="#1f2937" textAnchor="middle" fontWeight="bold" stroke="white" strokeWidth="0.3" className="transition-all duration-300">{c.id}</text>
                                    {/* Transport Emoji */}
                                    <text x={c.x} y={c.y + 5} fontSize="3" textAnchor="middle" className="transition-all duration-300">{emoji}</text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Overlay Info */}
                    <div className="absolute bottom-4 right-4 bg-white/95 p-3 rounded-lg text-xs shadow-xl border-2 border-gray-300 text-gray-700 font-medium">
                        <p className="font-bold text-gray-800 mb-1">Map: 100x100</p>
                        <p>Queue: <span className="text-yellow-600 font-bold">{orderQueue.length}</span></p>
                        <p className="mt-2 pt-2 border-t border-gray-300 text-xs">
                            <span className="mr-2">🚶 ≤5kg</span>
                            <span className="mr-2">🚲 ≤15kg</span>
                            <span>🚗 ≤50kg</span>
                        </p>
                    </div>

                    {/* Status Legend */}
                    <div className="absolute top-4 left-4 bg-white/95 p-3 rounded-lg shadow-xl border-2 border-gray-300">
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs font-semibold text-gray-700">Free</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-xs font-semibold text-gray-700">Busy</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
