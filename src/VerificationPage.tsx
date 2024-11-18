import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import './TextEditor.css';

interface ChartData {
    time: string;
    charactersTyped: number;
    typingSpeed: number;
    character: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip">
                <p className="tooltip-time">Time: {label}</p>
                <p className="tooltip-character">
                    Character: "{data.character === ' ' ? '⎵' : data.character}"
                </p>
                <p className="tooltip-count">Total Characters: {data.charactersTyped}</p>
                <p className="tooltip-speed">Typing Speed: {data.typingSpeed} CPM</p>
            </div>
        );
    }
    return null;
};

const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
        return `${seconds} seconds`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 1) {
        return remainingSeconds > 0 ? `1 minute ${remainingSeconds} seconds` : '1 minute';
    }

    return remainingSeconds > 0 ? `${minutes} minutes ${remainingSeconds} seconds` : `${minutes} minutes`;
};

const calculateRollingSpeed = (keypresses: any[]) => {
    const windowSize = 5;
    return keypresses.map((press, index) => {
        let typingSpeed = 0;
        if (index >= windowSize - 1) {
            const windowStart = keypresses[index - (windowSize - 1)];
            const windowEnd = press;
            const timeSpan = new Date(windowEnd.timestamp).getTime() - new Date(windowStart.timestamp).getTime();
            typingSpeed = Math.round((windowSize * 60 * 1000) / timeSpan);
        }
        return {
            time: new Date(press.timestamp).toLocaleTimeString(),
            charactersTyped: press.total_characters,
            typingSpeed,
            character: press.character
        };
    });
};

const VerificationPage = () => {
    const { id } = useParams<{ id: string }>();
    const [content, setContent] = useState<string>('');
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`https://hammerhead-app-2-hz4n4.ondigitalocean.app/api/verify/${id}`);
                const data = await response.json();

                setContent(data.document.content);

                if (data.keypresses?.length > 0) {
                    const chartPoints = calculateRollingSpeed(data.keypresses);
                    setChartData(chartPoints);

                    // Calculate statistics using CPM from the last few keypresses
                    const lastFewKeypresses = data.keypresses.slice(-5);
                    const timeSpan = new Date(lastFewKeypresses[lastFewKeypresses.length - 1].timestamp).getTime() -
                        new Date(lastFewKeypresses[0].timestamp).getTime();
                    const finalSpeed = Math.round((lastFewKeypresses.length * 60 * 1000) / timeSpan);

                    setStatistics({
                        totalCharacters: data.document.total_characters,
                        duration: data.document.time_taken_seconds,
                        averageSpeed: finalSpeed
                    });
                }
            } catch (error) {
                console.error('Failed to fetch verification data:', error);
            }
        };

        fetchData();
    }, [id]);

    return (
        <div className="app-container">
            <div className="content-wrapper">
                <h1 className="title">Verification Results</h1>

                <div className="main-container">
                    <div className="editor-section">
                        <div className="preview-area">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="chart-section">
                        <div className="chart-container">
                            <h2 className="chart-title">Typing Analysis</h2>
                            <div className="chart-wrapper">
                                <div className="chart-box">
                                    <h3 className="chart-subtitle">Typing Speed</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart
                                            data={chartData}
                                            margin={{top: 5, right: 10, left: -20, bottom: 5}}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                                            <XAxis
                                                dataKey="time"
                                                stroke="#9CA3AF"
                                                tick={{fill: '#9CA3AF', fontSize: windowWidth < 768 ? 10 : 12}}
                                                interval={windowWidth < 768 ? 2 : 0}
                                            />
                                            <YAxis
                                                stroke="#9CA3AF"
                                                tick={{fill: '#9CA3AF', fontSize: windowWidth < 768 ? 10 : 12}}
                                            />
                                            <Tooltip content={<CustomTooltip/>}/>
                                            <Line
                                                type="monotone"
                                                dataKey="typingSpeed"
                                                name="Typing Speed (CPM)"
                                                stroke="#60A5FA"
                                                strokeWidth={2}
                                                dot={windowWidth >= 768}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {statistics && (
                                    <div className="chart-box p-4">
                                        <h2 className="chart-subtitle">Typing Statistics</h2>
                                        <div className="stats-grid">
                                            <div className="stat-item">
                                                <h3>Total Characters</h3>
                                                <p className="stat-value">{statistics.totalCharacters}</p>
                                            </div>
                                            <div className="stat-item">
                                                <h3>Time Taken</h3>
                                                <p className="stat-value">{formatDuration(statistics.duration)}</p>
                                            </div>
                                            <div className="stat-item">
                                                <h3>Average Speed</h3>
                                                <p className="stat-value">{statistics.averageSpeed} CPM</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationPage;