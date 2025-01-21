import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle } from 'lucide-react';


export const handleParsedData = (parsedData) => {
    setData(parsedData); // Update the component's data state
    setError(''); // Clear any existing errors
};
export const CSVUpload = ({ onDataParsed }) => {
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateAndTransformRow = (row) => {
        if (!row.R || !row.X || !row.Zone) return null;

        const point = {
            R: parseFloat(row.R),
            X: parseFloat(row.X),
            Zone: parseInt(row.Zone) || 'default'
        };

        return (!isNaN(point.R) && !isNaN(point.X)) ? point : null;
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setError('');
        setIsLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const validPoints = results.data
                    .map(validateAndTransformRow)
                    .filter(Boolean);

                if (validPoints.length === 0) {
                    setError('No valid data points found');
                    setData([]);
                } else {
                    setData(validPoints);
                    onDataParsed?.(validPoints);
                }
                setIsLoading(false);
            },
            error: (error) => {
                setError(`Error parsing CSV file: ${error.message}`);
                setData([]);
                setIsLoading(false);
            }
        });
    };

    return (
        <div>
            <div className="flex items-center space-x-4 mb-4">
                <label className="relative">
                    <div className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose CSV
                    </div>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden absolute"
                    />
                </label>
                {fileName && (
                    <span className="text-sm text-gray-600 flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {fileName}
                    </span>
                )}
            </div>

            {error && (
                <div className="flex items-center text-red-500 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                </div>
            )}

            {isLoading && (
                <div className="text-sm text-gray-600">
                    Processing file...
                </div>
            )}
        </div>
    );
};

export default CSVUpload;