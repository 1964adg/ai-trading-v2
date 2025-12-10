/**
 * Example: Using EnhancedOrderPanel with API Integration
 * 
 * This example demonstrates how to integrate the EnhancedOrderPanel
 * component with the advanced orders API client.
 */

import { useState } from 'react';
import EnhancedOrderPanel from '@/components/orders/EnhancedOrderPanel';
import { 
  EnhancedOrderType, 
  CreateOCOOrderRequest,
  CreateBracketOrderRequest,
  CreateIcebergOrderRequest,
  CreateAdvancedTrailingStopRequest
} from '@/types/enhanced-orders';
import { advancedOrdersAPI } from '@/lib/advanced-orders-api';

type OrderRequest = 
  | CreateOCOOrderRequest 
  | CreateBracketOrderRequest 
  | CreateIcebergOrderRequest 
  | CreateAdvancedTrailingStopRequest;

export default function TradingPage() {
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [symbol] = useState('BTCUSDT');
  const [currentPrice] = useState(45000);
  const [accountBalance] = useState(10000);

  const handleOrderSubmit = async (
    orderType: EnhancedOrderType,
    request: OrderRequest
  ) => {
    try {
      let response;
      
      switch (orderType) {
        case 'OCO':
          response = await advancedOrdersAPI.createOCOOrder(request as CreateOCOOrderRequest);
          console.log('OCO Order Created:', response);
          break;
          
        case 'BRACKET':
          response = await advancedOrdersAPI.createBracketOrder(request as CreateBracketOrderRequest);
          console.log('Bracket Order Created:', response);
          break;
          
        case 'ICEBERG':
          response = await advancedOrdersAPI.createIcebergOrder(request as CreateIcebergOrderRequest);
          console.log('Iceberg Order Created:', response);
          break;
          
        case 'TRAILING_STOP':
          response = await advancedOrdersAPI.createTrailingStopOrder(request as CreateAdvancedTrailingStopRequest);
          console.log('Trailing Stop Order Created:', response);
          break;
          
        default:
          throw new Error(`Unsupported order type: ${orderType}`);
      }

      if (response.success) {
        // Handle success - maybe show a notification
        console.log('Order submitted successfully!');
      } else {
        throw new Error(response.error || 'Order submission failed');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      throw error; // Re-throw to let the form handle the error
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={() => setShowOrderPanel(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Open Advanced Orders
      </button>

      {showOrderPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EnhancedOrderPanel
              symbol={symbol}
              currentPrice={currentPrice}
              accountBalance={accountBalance}
              onClose={() => setShowOrderPanel(false)}
              onOrderSubmit={handleOrderSubmit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
