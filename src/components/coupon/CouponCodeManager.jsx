import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, Ticket, ArrowUpDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, isDateInPast, isDateInFuture } from "../utils/dateUtils";

export default function CouponCodeManager({ showNotification }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    applicable_plans: ["all"],
    valid_from: "",
    valid_until: "",
    max_uses: "",
    is_active: true
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupon-codes"],
    queryFn: () => base44.entities.CouponCode.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CouponCode.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupon-codes"] });
      resetForm();
      showNotification("Coupon code created successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to create coupon: ${error.message}`, "Error", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CouponCode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupon-codes"] });
      resetForm();
      showNotification("Coupon code updated successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to update coupon: ${error.message}`, "Error", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CouponCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupon-codes"] });
      showNotification("Coupon code deleted successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to delete coupon: ${error.message}`, "Error", "error");
    }
  });

  const sortedCoupons = useMemo(() => {
    return [...coupons].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "created_date" || sortField === "valid_from" || sortField === "valid_until") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [coupons, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      applicable_plans: ["all"],
      valid_from: "",
      valid_until: "",
      max_uses: "",
      is_active: true
    });
    setEditingCoupon(null);
    setShowForm(false);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || "",
      description: coupon.description || "",
      discount_type: coupon.discount_type || "percentage",
      discount_value: coupon.discount_value?.toString() || "",
      applicable_plans: coupon.applicable_plans || ["all"],
      valid_from: coupon.valid_from || "",
      valid_until: coupon.valid_until || "",
      max_uses: coupon.max_uses?.toString() || "",
      is_active: coupon.is_active !== false
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.discount_value) {
      showNotification("Please fill in code and discount value", "Missing Information", "error");
      return;
    }

    const cleanedData = {
      ...formData,
      code: formData.code.toUpperCase().trim(),
      discount_value: parseFloat(formData.discount_value),
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      current_uses: editingCoupon ? editingCoupon.current_uses : 0
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handlePlanToggle = (plan) => {
    if (plan === "all") {
      setFormData({ ...formData, applicable_plans: ["all"] });
    } else {
      const currentPlans = formData.applicable_plans.filter(p => p !== "all");
      const hasAll = formData.applicable_plans.includes("all");
      
      if (currentPlans.includes(plan)) {
        const newPlans = currentPlans.filter(p => p !== plan);
        setFormData({ ...formData, applicable_plans: newPlans.length === 0 ? ["all"] : newPlans });
      } else {
        setFormData({ ...formData, applicable_plans: hasAll ? [plan] : [...currentPlans, plan] });
      }
    }
  };

  const getCouponStatus = (coupon) => {
    if (!coupon.is_active) return { text: "Inactive", color: "bg-slate-400 text-white dark:bg-slate-600" };
    
    if (isDateInFuture(coupon.valid_from)) {
      return { text: "Scheduled", color: "bg-blue-500 text-white dark:bg-blue-600" };
    }
    
    if (isDateInPast(coupon.valid_until)) {
      return { text: "Expired", color: "bg-red-500 text-white dark:bg-red-600" };
    }
    
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { text: "Limit Reached", color: "bg-orange-500 text-white dark:bg-orange-600" };
    }
    return { text: "Active", color: "bg-indigo-600 text-white dark:bg-indigo-500" };
  };

  const activeCoupons = coupons.filter(c => {
    if (!c.is_active) return false;
    if (isDateInPast(c.valid_until)) return false;
    if (c.max_uses && c.current_uses >= c.max_uses) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Coupon Codes</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage discount codes for your subscription plans</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Coupon
        </Button>
      </div>

      {activeCoupons.length > 0 && (
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm text-indigo-900 dark:text-indigo-100">
              <strong>{activeCoupons.length}</strong> active coupon{activeCoupons.length !== 1 ? 's' : ''} available for use
            </p>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {showForm && !editingCoupon && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Create New Coupon</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-slate-100">Coupon Code *</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SUMMER2025"
                      className="font-mono uppercase bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-slate-900 dark:text-slate-100">Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Summer promotion"
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-slate-100">Discount Type *</Label>
                    <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                      <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-900 dark:text-slate-100">
                      Discount Value * {formData.discount_type === "percentage" ? "(%)" : "($)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === "percentage" ? "20" : "10.00"}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-900 dark:text-slate-100 mb-3 block">Applicable Plans *</Label>
                  <div className="flex flex-wrap gap-3">
                    {["all", "daily", "weekly", "monthly", "annual"].map((plan) => (
                      <label key={plan} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.applicable_plans.includes(plan)}
                          onCheckedChange={() => handlePlanToggle(plan)}
                          className="border-slate-300 dark:border-slate-600"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{plan}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-slate-100">Valid From</Label>
                    <Input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-900 dark:text-slate-100">Valid Until</Label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-900 dark:text-slate-100">Max Uses</Label>
                    <Input
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="Unlimited"
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    className="border-slate-300 dark:border-slate-600"
                  />
                  <Label className="text-slate-900 dark:text-slate-100 cursor-pointer">Active</Label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button type="button" variant="outline" onClick={resetForm} className="border-slate-300 dark:border-slate-600">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                    Create Coupon
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No coupons yet</h3>
            <p className="text-slate-600 dark:text-slate-400">Create your first coupon code to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left w-[20%]">
                    <button
                      onClick={() => handleSort("code")}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Code <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-[12%] text-xs font-medium text-slate-700 dark:text-slate-300">Discount</th>
                  <th className="px-4 py-3 text-left w-[15%] text-xs font-medium text-slate-700 dark:text-slate-300">Plans</th>
                  <th className="px-4 py-3 text-left w-[12%]">
                    <button
                      onClick={() => handleSort("current_uses")}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Usage <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-[18%] text-xs font-medium text-slate-700 dark:text-slate-300">Valid Period</th>
                  <th className="px-4 py-3 text-left w-[13%] text-xs font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-right w-[10%] text-xs font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  const isEditing = editingCoupon?.id === coupon.id;
                  
                  return (
                    <React.Fragment key={coupon.id}>
                      {!isEditing ? (
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-4 py-4 align-middle">
                            <div>
                              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">{coupon.code}</div>
                              {coupon.description && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{coupon.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {coupon.applicable_plans.includes("all") ? (
                                <Badge variant="secondary" className="text-xs">All Plans</Badge>
                              ) : (
                                coupon.applicable_plans.map(plan => (
                                  <Badge key={plan} variant="secondary" className="text-xs capitalize">{plan}</Badge>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="text-sm text-slate-900 dark:text-slate-100">
                              {coupon.current_uses || 0} {coupon.max_uses ? `/ ${coupon.max_uses}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {coupon.valid_from && <div>From: {formatDate(coupon.valid_from)}</div>}
                              {coupon.valid_until && <div>Until: {formatDate(coupon.valid_until)}</div>}
                              {!coupon.valid_from && !coupon.valid_until && <div>No limit</div>}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <Badge className={status.color}>{status.text}</Badge>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(coupon)}
                                className="text-indigo-600 dark:text-indigo-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(coupon.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-6 bg-indigo-50 dark:bg-indigo-950/30">
                            <form onSubmit={handleSubmit} className="space-y-6">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Edit Coupon</h3>

                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-slate-900 dark:text-slate-100">Coupon Code *</Label>
                                  <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="font-mono uppercase bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                                    required
                                  />
                                </div>

                                <div>
                                  <Label className="text-slate-900 dark:text-slate-100">Description</Label>
                                  <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                                  />
                                </div>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-slate-900 dark:text-slate-100">Discount Type *</Label>
                                  <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                                    <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-slate-900 dark:text-slate-100">
                                    Discount Value * {formData.discount_type === "percentage" ? "(%)" : "($)"}
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.discount_value}
                                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <Label className="text-slate-900 dark:text-slate-100 mb-3 block">Applicable Plans *</Label>
                                <div className="flex flex-wrap gap-3">
                                  {["all", "daily", "weekly", "monthly", "annual"].map((plan) => (
                                    <label key={plan} className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox
                                        checked={formData.applicable_plans.includes(plan)}
                                        onCheckedChange={() => handlePlanToggle(plan)}
                                        className="border-slate-300 dark:border-slate-600"
                                      />
                                      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{plan}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-slate-900 dark:text-slate-100">Valid From</Label>
                                  <Input
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                                  />
                                </div>

                                <div>
                                  <Label className="text-slate-900 dark:text-slate-100">Valid Until</Label>
                                  <Input
                                    type="date"
                                    value={formData.valid_until}
                                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                                  />
                                </div>

                                <div>
                                  <Label className="text-slate-900 dark:text-slate-100">Max Uses</Label>
                                  <Input
                                    type="number"
                                    value={formData.max_uses}
                                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={formData.is_active}
                                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                  className="border-slate-300 dark:border-slate-600"
                                />
                                <Label className="text-slate-900 dark:text-slate-100 cursor-pointer">Active</Label>
                              </div>

                              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <Button type="button" variant="outline" onClick={resetForm} className="border-slate-300 dark:border-slate-600">
                                  Cancel
                                </Button>
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                                  Update Coupon
                                </Button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}