// src/VerificationPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import './TextEditor.css';  // Reuse the same CSS

interface ChartData {
    time: string;
    charactersTyped: number;
    typingSpeed: number;
    character: string;
}

// Custom tooltip component for the charts (same as TextEditor)
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

const VerificationPage = () => {
    const { id } = useParams<{ id: string }>();
    const [content, setContent] = useState<string>('');
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [statistics, setStatistics] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`https://hammerhead-app-2-hz4n4.ondigitalocean.app/api/verify/${id}`);
                const data = await response.json();

                // Set content and document info
                setContent(data.document.content);

                // Process chart data
                const chartPoints: ChartData[] = [];
                const windowSize = 5; // Same as TextEditor

                data.keypresses.forEach((press: any, index: number) => {
                    // Calculate typing speed based on moving average
                    let typingSpeed = 0;
                    if (index >= windowSize) {
                        const recentPresses = data.keypresses.slice(index - windowSize, index + 1);
                        const timeSpan = new Date(recentPresses[recentPresses.length - 1].timestamp).getTime() -
                            new Date(recentPresses[0].timestamp).getTime();
                        typingSpeed = Math.round((recentPresses.length * 60 * 1000) / timeSpan);
                    }

                    chartPoints.push({
                        time: new Date(press.timestamp).toLocaleTimeString(),
                        charactersTyped: index + 1,
                        typingSpeed: typingSpeed,
                        character: press.character
                    });
                });

                setChartData(chartPoints);

                // Calculate statistics
                if (data.keypresses.length > 0) {
                    const startTime = new Date(data.keypresses[0].timestamp).getTime();
                    const endTime = new Date(data.keypresses[data.keypresses.length - 1].timestamp).getTime();
                    const durationSeconds = (endTime - startTime) / 1000;
                    const averageSpeed = Math.round((data.keypresses.length * 60) / (durationSeconds / 60));

                    setStatistics({
                        totalCharacters: data.keypresses.length,
                        duration: durationSeconds,
                        averageSpeed: averageSpeed
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
                                    <LineChart
                                        width={550}
                                        height={250}
                                        data={chartData}
                                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis
                                            dataKey="time"
                                            stroke="#9CA3AF"
                                            tick={{ fill: '#9CA3AF' }}
                                        />
                                        <YAxis
                                            stroke="#9CA3AF"
                                            tick={{ fill: '#9CA3AF' }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="monotone"
                                            dataKey="typingSpeed"
                                            name="Typing Speed (CPM)"
                                            stroke="#60A5FA"
                                            strokeWidth={2}
                                            dot
                                        />
                                    </LineChart>
                                </div>
                            </div>
                        </div>

                        {statistics && (
                            <div className="chart-box mt-4 p-4">
                                <h2 className="chart-subtitle mb-4">Typing Statistics</h2>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="stat-item">
                                        <p className="font-bold">Total Characters</p>
                                        <p>{statistics.totalCharacters}</p>
                                    </div>
                                    <div className="stat-item">
                                        <p className="font-bold">Time Taken</p>
                                        <p>{Math.round(statistics.duration)} seconds</p>
                                    </div>
                                    <div className="stat-item">
                                        <p className="font-bold">Average Speed</p>
                                        <p>{statistics.averageSpeed} CPM</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationPage;