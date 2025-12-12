import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Trash2, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/forecastService';
import { 
  GlassCard, 
  Button, 
  Select, 
  Alert, 
  Spinner, 
  Badge,
  Modal
} from '../components/common';
import { PRODUCT_APS_MAPPING, EXCEL_SHEETS } from '../utils/constants';
import { formatFileSize } from '../utils/formatters';
import clsx from 'clsx';

function DevMode() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // State
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Upload state
  const [uploadMode, setUploadMode] = useState('product'); // 'product', 'aps', 'update'
  const [productCode, setProductCode] = useState('');
  const [selectedAps, setSelectedAps] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await adminService.getProductsList();
      setProducts(response.products || []);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Auto-preview
    try {
      const response = await adminService.previewUpload(file);
      setPreviewData(response);
    } catch (err) {
      console.error('Preview failed:', err);
    }
  }, []);

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !productCode) {
      setError('Please select a file and enter a product code');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('product_code', productCode.toUpperCase());
      formData.append('upload_type', uploadMode);
      
      if (uploadMode === 'aps' && selectedAps) {
        formData.append('aps_class', selectedAps);
      }

      const response = await adminService.uploadData(formData);

      if (response.success) {
        setSuccess(`Successfully uploaded data for ${productCode}`);
        setSelectedFile(null);
        setPreviewData(null);
        loadProducts();
      } else {
        setError(response.errors?.join(', ') || 'Upload failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template download
  const handleDownloadTemplate = async () => {
    if (!productCode) {
      setError('Please enter a product code first');
      return;
    }

    setIsLoading(true);
    try {
      const blob = await adminService.downloadTemplate(productCode.toUpperCase(), true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productCode.toUpperCase()}_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (product, apsClass = null) => {
    if (!confirm(`Are you sure you want to delete ${apsClass || product}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await adminService.deleteProduct(product, apsClass);
      setSuccess(`Deleted ${apsClass || product}`);
      loadProducts();
    } catch (err) {
      setError('Failed to delete');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if product exists
  const productExists = products.some(p => p.code === productCode.toUpperCase());

  // Get APS options for selected product
  const apsOptions = productCode && PRODUCT_APS_MAPPING[productCode.toUpperCase()]
    ? PRODUCT_APS_MAPPING[productCode.toUpperCase()]
    : [];

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 z-[var(--z-sticky)] glass-subtle border-b border-surface-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Exit Dev Mode
            </Button>
            <h1 className="text-lg font-semibold text-daikin-dark">
              Development Mode
            </h1>
            <div className="w-24" /> {/* Spacer for alignment */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GlassCard padding="lg">
                <h2 className="text-xl font-semibold text-daikin-dark mb-6">
                  Upload Product Data
                </h2>

                {/* Alerts */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <Alert type="error" onClose={() => setError(null)}>
                        {error}
                      </Alert>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <Alert type="success" onClose={() => setSuccess(null)}>
                        {success}
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6">
                  {/* Product Code */}
                  <div>
                    <label className="block text-sm font-medium text-daikin-dark mb-1.5">
                      Product Code
                    </label>
                    <input
                      type="text"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                      maxLength={3}
                      placeholder="e.g., CN, HP, FN"
                      className="w-full h-10 px-3 rounded-lg glass-input text-sm uppercase"
                    />
                    {productCode && (
                      <p className="mt-1 text-xs text-surface-500">
                        {productExists ? (
                          <span className="text-green-600">Product exists in system</span>
                        ) : (
                          <span className="text-amber-600">New product - will be created</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Upload Mode */}
                  {productExists && (
                    <Select
                      label="Upload Type"
                      value={uploadMode}
                      onChange={setUploadMode}
                      options={[
                        { value: 'product', label: 'Product Total Data' },
                        { value: 'aps', label: 'APS Class Data' },
                        { value: 'update', label: 'Update Weights/Market Share' },
                      ]}
                    />
                  )}

                  {/* APS Selector */}
                  {uploadMode === 'aps' && apsOptions.length > 0 && (
                    <Select
                      label="APS Class"
                      value={selectedAps}
                      onChange={setSelectedAps}
                      options={apsOptions.map(aps => ({ value: aps, label: aps }))}
                      placeholder="Select APS Class"
                    />
                  )}

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-daikin-dark mb-1.5">
                      Excel File
                    </label>
                    <div 
                      className={clsx(
                        'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
                        'hover:border-daikin-blue/50 hover:bg-daikin-blue/5',
                        selectedFile 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-surface-300'
                      )}
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileSpreadsheet className="h-8 w-8 text-green-500" />
                          <div className="text-left">
                            <p className="font-medium text-daikin-dark">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-surface-500">
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 text-surface-400 mx-auto mb-2" />
                          <p className="text-sm text-surface-600">
                            Click or drag to upload Excel file
                          </p>
                          <p className="text-xs text-surface-400 mt-1">
                            .xlsx or .xls files only
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview Button */}
                  {previewData && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowPreview(true)}
                      leftIcon={<Eye className="h-4 w-4" />}
                      className="w-full"
                    >
                      Preview File Contents
                    </Button>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={handleDownloadTemplate}
                      disabled={!productCode || isLoading}
                      leftIcon={<Download className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Download Template
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleUpload}
                      disabled={!selectedFile || !productCode || isLoading}
                      isLoading={isLoading}
                      leftIcon={<Upload className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Upload
                    </Button>
                  </div>

                  {/* Expected Sheets Info */}
                  <div className="p-4 bg-surface-50 rounded-lg">
                    <p className="text-sm font-medium text-daikin-dark mb-2">
                      Expected Excel Sheets:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(EXCEL_SHEETS).map(([key, name]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-daikin-blue" />
                          <span className="text-surface-600">{name}</span>
                          {key === 'baseline' && (
                            <Badge variant="primary" size="sm">Required</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Existing Products Section */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <GlassCard padding="lg">
                <h2 className="text-xl font-semibold text-daikin-dark mb-6">
                  Existing Products
                </h2>

                {isLoading && products.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-surface-500">
                    No products found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div
                        key={product.code}
                        className="p-4 rounded-lg border border-surface-200 hover:border-daikin-blue/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-daikin-dark">
                              {product.code}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {product.has_baseline && (
                                <Badge variant="success" size="sm">Baseline</Badge>
                              )}
                              {product.has_weights && (
                                <Badge variant="info" size="sm">Weights</Badge>
                              )}
                              {product.has_market_share && (
                                <Badge variant="primary" size="sm">Market Share</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(product.code)}
                            className="text-surface-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* APS Classes */}
                        {product.aps_classes?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-surface-100">
                            <p className="text-xs text-surface-500 mb-2">APS Classes:</p>
                            <div className="flex flex-wrap gap-2">
                              {product.aps_classes.map((aps) => (
                                <div
                                  key={aps}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-surface-100 text-xs"
                                >
                                  <span>{aps}</span>
                                  <button
                                    onClick={() => handleDelete(product.code, aps)}
                                    className="text-surface-400 hover:text-red-500 ml-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Available APS (not yet uploaded) */}
                        {product.available_aps?.filter(aps => 
                          !product.aps_classes?.includes(aps)
                        ).length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-surface-400">
                              Available: {product.available_aps.filter(aps => 
                                !product.aps_classes?.includes(aps)
                              ).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="File Preview"
        size="xl"
      >
        {previewData && (
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            {Object.entries(previewData.sheets || {}).map(([sheetName, sheetData]) => (
              <div key={sheetName} className="border border-surface-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-surface-50 border-b border-surface-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-daikin-dark">{sheetName}</span>
                    <Badge variant="info" size="sm">
                      {sheetData.row_count} rows
                    </Badge>
                  </div>
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-200">
                        {sheetData.columns?.map((col, i) => (
                          <th key={i} className="px-2 py-1 text-left font-medium text-surface-600">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetData.preview?.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-surface-100">
                          {sheetData.columns?.map((col, j) => (
                            <td key={j} className="px-2 py-1 text-surface-600">
                              {row[col] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DevMode;