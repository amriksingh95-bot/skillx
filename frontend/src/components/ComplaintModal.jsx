import React, { useState } from 'react';
import Modal from './Modal';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ComplaintModal({ 
  isOpen, 
  onClose, 
  complaintTypes = ['Payment Issue', 'Points Not Received', 'App Problem', 'Other'],
  apiEndpoint = '/api/customer/complaint',
  defaultType = 'Payment Issue'
}) {
  const [complaintType, setComplaintType] = useState(defaultType);
  const [complaintDescription, setComplaintDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complaintDescription.trim()) {
      return toast.error('Please describe your issue.');
    }

    setIsSubmitting(true);
    try {
      await api.post(apiEndpoint, {
        type: complaintType,
        description: complaintDescription
      });
      toast.success('Complaint submitted successfully.');
      setComplaintDescription('');
      setComplaintType(defaultType);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit complaint.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComplaintDescription('');
    setComplaintType(defaultType);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit Complaint or Feedback"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Complaint Type</label>
          <select
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
            value={complaintType}
            onChange={(e) => setComplaintType(e.target.value)}
          >
            {complaintTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Describe the Issue</label>
          <textarea
            required
            rows={4}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            placeholder="Please provide details about the problem you encountered..."
            value={complaintDescription}
            onChange={(e) => setComplaintDescription(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all btn-press"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 btn-press"
          >
            {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
            Submit
          </button>
        </div>
      </form>
    </Modal>
  );
}
