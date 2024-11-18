// src/App.tsx
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import './TextEditor.css';

interface KeyPress {
    character: string;
    timestamp: number;
}

interface ChartData {
    time: string;
    charactersTyped: number;
    typingSpeed: number;
    timestamp: number;
    character: string;
}

// Custom tooltip component for the charts
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

const TextEditor = () => {
    const [content, setContent] = useState<string>('');
    const [keyPresses, setKeyPresses] = useState<KeyPress[]>([]);
    const [previewMode, setPreviewMode] = useState<boolean>(false);
    const [submittedUrl, setSubmittedUrl] = useState<string>('');
    const [documentId, setDocumentId] = useState<string | null>(null);
    const API_BASE_URL = 'http://localhost:5000';

    useEffect(() => {
        const createDocument = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/documents`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: 'New Typing Session',
                        content: ''
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to create document');
                }

                const data = await response.json();
                setDocumentId(data.id);
                console.log('Document created with ID:', data.id);
            } catch (error) {
                console.error('Error creating document:', error);
            }
        };

        createDocument();
    }, []);

    const processKeyPresses = (presses: KeyPress[]): ChartData[] => {
        if (presses.length === 0) return [];

        const data: ChartData[] = [];
        const windowSize = 5; // Number of keypresses to average over

        for (let i = 0; i < presses.length; i++) {
            // Calculate typing speed based on moving average
            let typingSpeed = 0;
            if (i >= windowSize) {
                const recentPresses = presses.slice(i - windowSize, i + 1);
                const timeSpan = recentPresses[recentPresses.length - 1].timestamp - recentPresses[0].timestamp;
                typingSpeed = Math.round((recentPresses.length * 60 * 1000) / timeSpan);
            }

            data.push({
                time: new Date(presses[i].timestamp).toLocaleTimeString(),
                charactersTyped: i + 1,
                typingSpeed: typingSpeed,
                timestamp: presses[i].timestamp,
                character: presses[i].character
            });
        }

        return data;
    };

    const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        if (newContent.length < content.length) {
            // Handle deletion - update content but don't record as a keypress
            setContent(newContent);
            return;
        }

        const newChar = newContent.slice(-1);
        const newKeyPress = {
            character: newChar,
            timestamp: Date.now(),
            document_id: documentId
        };

        setContent(newContent);
        const updatedKeyPresses = [...keyPresses, newKeyPress];
        setKeyPresses(updatedKeyPresses);

        try {
            const response = await fetch(`${API_BASE_URL}/api/keypress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newKeyPress),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Keypress error:', errorData);
                return;
            }

            const data = await response.json();
            console.log('Keypress recorded:', data);
        } catch (error) {
            console.error('Failed to send keypress:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!documentId) {
                console.error('No document ID available');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    document_id: documentId,
                    content: content,
                    keyPresses: keyPresses
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Submit error:', errorData);
                return;
            }

            const data = await response.json();
            setSubmittedUrl(data.verification_url);

            // Log statistics if available
            if (data.statistics) {
                console.log('Typing Analysis:', {
                    'Total Characters': data.statistics.total_characters,
                    'Average Speed (CPM)': data.statistics.average_speed,
                    'Max Speed (CPM)': data.statistics.max_speed,
                    'Duration (seconds)': data.statistics.duration_seconds
                });
            }
        } catch (error) {
            console.error('Failed to submit:', error);
        }
    };

    const chartData = processKeyPresses(keyPresses);

    return (
        <div className="app-container">
            <div className="content-wrapper">
                <h1 className="title">Human Typed</h1>

                <div className="main-container">
                    <div className="editor-section">
                        <button
                            className="preview-button"
                            onClick={() => setPreviewMode(!previewMode)}
                        >
                            {previewMode ? 'Edit' : 'Preview'}
                        </button>

                        {previewMode ? (
                            <div className="preview-area">
                                <ReactMarkdown>{content}</ReactMarkdown>
                            </div>
                        ) : (
                            <textarea
                                value={content}
                                onChange={handleTextChange}
                                className="text-input"
                                placeholder="Start typing your content here... Markdown is supported!"
                            />
                        )}
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

                        <button
                            onClick={handleSubmit}
                            className="verify-button"
                        >
                            Verify My Typing
                        </button>

                        {submittedUrl && (
                            <div className="url-container">
                                <p>
                                    Verification URL:{' '}
                                    <a href={submittedUrl} className="url-link">
                                        {submittedUrl}
                                    </a>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TextEditor;