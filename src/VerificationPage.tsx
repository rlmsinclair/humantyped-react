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
                    const chartPoints = data.keypresses.map((press: any) => ({
                        time: new Date(press.timestamp).toLocaleTimeString(),
                        charactersTyped: press.total_characters,
                        typingSpeed: Math.round(press.typing_speed / 5), // Convert CPM to WPM
                        character: press.character
                    }));

                    setChartData(chartPoints);

                    // Calculate WPM: (total characters / 5) / minutes
                    const minutes = data.document.time_taken_seconds / 60;
                    const wpm = Math.round((data.document.total_characters / 5) / minutes);

                    setStatistics({
                        totalCharacters: data.document.total_characters,
                        duration: data.document.time_taken_seconds,
                        averageSpeed: wpm
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
                                                <h3>Estimated Average Speed</h3>
                                                <p className="stat-value">{statistics.averageSpeed} WPM</p>
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