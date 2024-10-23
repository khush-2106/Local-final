"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Loader2, Plus, Printer, Trash, Edit, Menu, Search, Undo, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Order {
  id: string
  client: string
  manufacturer: string
  product: string
  quantity: number
  status: string
  date: string
  timeline: { status: string; timestamp: string }[]
}

interface NewOrder {
  client: string
  manufacturer: string
  quantity: number
  newClient?: string
  newManufacturer?: string
}

const orderStatuses = [
  "Order Received",
  "Retrieved from Manufacturer",
  "At Photography Studio",
  "Collected from Studio",
  "Returned to Manufacturer",
  "Pre Printing",
  "Printing",
  "Post Printing",
  "Photos Delivered",
]

export function DashboardComponent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newOrder, setNewOrder] = useState<NewOrder>({
    client: "",
    manufacturer: "",
    quantity: 0,
  })
  const [isAddingOrder, setIsAddingOrder] = useState(false)
  const [selectedChallanOrders, setSelectedChallanOrders] = useState<string[]>([])
  const [challanType, setChallanType] = useState("")
  const [photosDelivered, setPhotosDelivered] = useState<Record<string, number>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clients, setClients] = useState<string[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [collapsedOrders, setCollapsedOrders] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Load saved orders from localStorage
    const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]') as Order[]
    setOrders(savedOrders)

    // Extract unique clients and manufacturers
    const uniqueClients = Array.from(new Set(savedOrders.map(order => order.client)))
    const uniqueManufacturers = Array.from(new Set(savedOrders.map(order => order.manufacturer)))
    setClients(uniqueClients)
    setManufacturers(uniqueManufacturers)

    // Initialize collapsed state for completed orders
    const initialCollapsedState = savedOrders.reduce((acc: Record<string, boolean>, order) => {
      if (order.status === "Photos Delivered") {
        acc[order.id] = true
      }
      return acc
    }, {})
    setCollapsedOrders(initialCollapsedState)
  }, [])

  useEffect(() => {
    // Save orders to localStorage whenever they change
    localStorage.setItem('orders', JSON.stringify(orders))
  }, [orders])

  const totalOrders = orders.length
  const activeOrders = orders.filter(order => order.status !== "Photos Delivered").length
  const statusCounts = orders.reduce((acc: Record<string, number>, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})

  const handleAddOrder = () => {
    setIsAddingOrder(true)
    const newId = `ORD${String(orders.length + 1).padStart(3, '0')}`
    const orderToAdd: Order = {
      ...newOrder,
      id: newId,
      product: "Sarees", // Always set product to "Sarees"
      status: "Order Received",
      date: new Date().toISOString().split('T')[0],
      timeline: [{ status: "Order Received", timestamp: new Date().toISOString() }]
    }
    
    // Handle new client
    if (newOrder.client === "new" && newOrder.newClient) {
      orderToAdd.client = newOrder.newClient
      setClients([...clients, newOrder.newClient])
    }
    
    // Handle new manufacturer
    if (newOrder.manufacturer === "new" && newOrder.newManufacturer) {
      orderToAdd.manufacturer = newOrder.newManufacturer
      setManufacturers([...manufacturers, newOrder.newManufacturer])
    }
    
    setOrders([orderToAdd, ...orders])
    setNewOrder({ client: "", manufacturer: "", quantity: 0 })
    setIsAddingOrder(false)
    setIsDialogOpen(false)
  }

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? {
        ...order,
        status: newStatus,
        timeline: [...order.timeline, { status: newStatus, timestamp: new Date().toISOString() }]
      } : order
    )
    setOrders(updatedOrders)
    if (newStatus === "Photos Delivered") {
      setCollapsedOrders(prev => ({ ...prev, [orderId]: true }))
    }
  }

  const handleUndoStatus = (orderId: string) => {
    const orderToUpdate = orders.find(order => order.id === orderId)
    if (orderToUpdate && orderToUpdate.timeline.length > 1) {
      const updatedTimeline = orderToUpdate.timeline.slice(0, -1)
      const updatedStatus = updatedTimeline[updatedTimeline.length - 1].status
      const updatedOrders = orders.map(order =>
        order.id === orderId ? {
          ...order,
          status: updatedStatus,
          timeline: updatedTimeline
        } : order
      )
      setOrders(updatedOrders)
      if (updatedStatus !== "Photos Delivered") {
        setCollapsedOrders(prev => ({ ...prev, [orderId]: false }))
      }
    }
  }

  const handleDeleteOrder = (orderId: string) => {
    const updatedOrders = orders.filter(order => order.id !== orderId)
    setOrders(updatedOrders)
  }

  const handleEditOrder = (orderId: string, updatedOrder: Partial<Order>) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, ...updatedOrder } : order
    )
    setOrders(updatedOrders)
    setIsDialogOpen(false)
  }

  const handleGenerateChallan = () => {
    if (!challanType || selectedChallanOrders.length === 0) {
      console.error("Cannot Generate Challan: Please select a challan type and at least one order.")
      return
    }

    const challanContent = `
    <html>
      <head>
        <title>Challan - ${challanType}</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            justify-content: ${challanType === 'master' ? 'flex-start' : 'space-between'};
            height: 297mm; /* A4 height */
          }
          .challan {
            width: 210mm; /* A4 width */
            padding: 10mm;
            box-sizing: border-box;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10mm;
          }
          h1 { color: #333; margin: 0; }
          h2 { margin: 0; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10mm;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 2mm;
            text-align: left;
          }
          th { background-color: #f2f2f2; }
          .signature {
            display: flex;
            justify-content: space-between;
            margin-top: 10mm;
          }
          .signature div {
            width: 80mm;
            border-top: 1px solid black;
            padding-top: 2mm;
            text-align: center;
          }
          .timeline {
            margin-top: 10mm;
          }
          .timeline-item {
            margin-bottom: 5mm;
          }
          .timeline-status {
            font-weight: bold;
          }
          .timeline-blank {
            height: 10mm;
            border-bottom: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        ${challanType === 'master' 
          ? `
            <div class="challan">
              <div class="header">
                <h1>PATEL OFFSET</h1>
                <h2>Master Challan</h2>
              </div>
              <p>Date: ${format(new Date(), "PPpp")}</p>
              <table>
                <tr>
                  <th>Order ID</th>
                  <th>Client</th>
                  <th>Manufacturer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Number of Prints</th>
                </tr>
                ${selectedChallanOrders.map(orderId => {
                  const order = orders.find(o => o.id === orderId)
                  return order ? `
                    <tr>
                      <td>${order.id}</td>
                      <td>${order.client}</td>
                      <td>${order.manufacturer}</td>
                      <td>${order.product}</td>
                      <td>${order.quantity}</td>
                      <td></td>
                    </tr>
                  ` : ''
                }).join('')}
              </table>
              <div class="timeline">
                ${orderStatuses.map(status => `
                  <div class="timeline-item">
                    <div class="timeline-status">${status}</div>
                    <div class="timeline-blank"></div>
                  </div>
                `).join('')}
              </div>
            </div>
          `
          : ['Delivery Man', 'End Party'].map((party, index) => `
            <div class="challan" style="${index === 1 ? 'margin-top: auto;' : ''}">
              <div class="header">
                <h1>PATEL OFFSET</h1>
                <h2>Challan - ${challanType} (${party} Copy)</h2>
              </div>
              <p>Date: ${format(new Date(), "PPpp")}</p>
              <table>
                <tr>
                  <th>Order ID</th>
                  <th>Client</th>
                  <th>Manufacturer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  ${challanType === "photos" ? "<th>Photos Delivered</th>" : ""}
                </tr>
                ${selectedChallanOrders.map(orderId => {
                  const order = orders.find(o => o.id === orderId)
                  return order ? `
                    <tr>
                      <td>${order.id}</td>
                      <td>${order.client}</td>
                      <td>${order.manufacturer}</td>
                      <td>${order.product}</td>
                      <td>${order.quantity}</td>
                      ${challanType === "photos" ? `<td>${photosDelivered[orderId] || 0}</td>` : ""}
                    </tr>
                  ` : ''
                }).join('')}
              </table>
              <div class="signature">
                <div>Delivery Man Signature</div>
                <div>End Party Signature</div>
              </div>
            </div>
          `).join('')
        }
      </body>
    </html>
  `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(challanContent)
      printWindow.document.close()
      printWindow.print()
    }

    // Reset selections
    setChallanType("")
    setSelectedChallanOrders([])
    setPhotosDelivered({})
  }

  const handleDeleteClient = (clientToDelete: string) => {
    setClients(clients.filter(client => client !== clientToDelete))
  }

  const handleDeleteManufacturer = (manufacturerToDelete: string) => {
    setManufacturers(manufacturers.filter(manufacturer => manufacturer !== manufacturerToDelete))
  }

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.date.includes(searchTerm)
  )

  const openNewOrderDialog = () => {
    setNewOrder({ client: "", manufacturer: "", quantity: 0 })
    setIsDialogOpen(true)
  }

  const toggleOrderCollapse = (orderId: string) => {
    setCollapsedOrders(prev => ({ ...prev, 
      [orderId]: !prev[orderId] }))
  }

  return (
    <div className="container mx-auto  p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-6"
      >
        <h1 className="text-2xl font-bold">PATEL OFFSET</h1>
        <Button onClick={openNewOrderDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Order
        </Button>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0  pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div  className="text-sm">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status}>{status}: {count}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="challans">Challans</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Order List</h2>
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <AnimatePresence>
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {index === 0 || order.date !== filteredOrders[index - 1].date ? (
                  <Separator className="my-4" />
                ) : null}
                <Card className={order.status === "Photos Delivered" ? "opacity-50" : ""}>
                  <CardHeader 
                    className="flex flex-row items-center justify-between cursor-pointer"
                    onClick={() => order.status === "Photos Delivered" && toggleOrderCollapse(order.id)}
                  >
                    <div>
                      <CardTitle>{order.id} - {order.client}</CardTitle>
                      <CardDescription>{format(new Date(order.date), "MMMM d, yyyy")}</CardDescription>
                    </div>
                    <div className="flex items-center">
                      {order.status === "Photos Delivered" && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            collapsedOrders[order.id] ? "transform rotate-180" : ""
                          }`}
                        />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Menu className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => {
                            setNewOrder(order)
                            setIsDialogOpen(true)
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Order
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleDeleteOrder(order.id)}>
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  {(!collapsedOrders[order.id] || order.status !== "Photos Delivered") && (
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="font-semibold">Manufacturer:</p>
                          <p>{order.manufacturer}</p>
                        </div>
                        <div>
                          <p className="font-semibold">Product:</p>
                          <p>{order.product}</p>
                        </div>
                        <div>
                          <p className="font-semibold">Quantity:</p>
                          <p>{order.quantity}</p>
                        </div>
                        <div>
                          <p className="font-semibold">Status:</p>
                          <p>{order.status}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 mb-4 overflow-x-auto">
                        {order.timeline.map((item, index) => (
                          <div key={index} className="flex-shrink-0 w-24 text-center">
                            <div className={`w-6 h-6 mx-auto rounded-full ${index === order.timeline.length - 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <p className="text-xs mt-1">{item.status}</p>
                            <p className="text-xs text-gray-500">{format(new Date(item.timestamp), "MMM d, HH:mm")}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between">
                        <Button 
                          onClick={() => handleUpdateStatus(order.id, orderStatuses[orderStatuses.indexOf(order.status) + 1])}
                          disabled={order.status === "Photos Delivered"}
                        >
                          Update Status
                        </Button>
                        <Button variant="outline" onClick={() => handleUndoStatus(order.id)}>
                          <Undo className="mr-2 h-4 w-4" />
                          Undo
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </TabsContent>
        <TabsContent value="challans" className="space-y-4">
          <h2 className="text-2xl font-semibold">Generate Challan</h2>
          <Card>
            <CardHeader>
              <CardTitle>Challan Details</CardTitle>
              <CardDescription>Select challan type and orders to include</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select onValueChange={(value) => setChallanType(value)}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select challan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receiving">Receiving from Manufacturer</SelectItem>
                    <SelectItem value="delivering">Delivering to Manufacturer</SelectItem>
                    <SelectItem value="photos">Photos Delivered</SelectItem>
                    <SelectItem value="master">Master Challan</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <Label htmlFor="orders">Select Orders</Label>
                  <Select
                    onValueChange={(value) => {
                      if (!selectedChallanOrders.includes(value)) {
                        setSelectedChallanOrders((prev) => [...prev, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select orders" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.id} - {order.client} - {order.manufacturer} - {format(new Date(order.date), "MMM d, yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedChallanOrders.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Selected Orders:</h3>
                    <ul>
                      {selectedChallanOrders.map((orderId) => (
                        <li key={orderId} className="flex justify-between items-center mb-2">
                          {orderId}
                          {challanType === "photos" && (
                            <Input
                              type="number"
                              placeholder="No. of photos"
                              className="w-32 mr-2"
                              value={photosDelivered[orderId] || ""}
                              onChange={(e) => setPhotosDelivered({
                                ...photosDelivered,
                                [orderId]: parseInt(e.target.value)
                              })}
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedChallanOrders(prev => prev.filter(id => id !== orderId))}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={handleGenerateChallan}>
                  <Printer className="mr-2 h-4 w-4" />
                  Generate and Print Challan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{newOrder ? "Edit Order" : "Add New Order"}</DialogTitle>
            <DialogDescription>
              {newOrder ? "Edit the order details. Click save when you're done." : "Enter the details for the new order. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Client
              </Label>
              <Select
                value={newOrder.client}
                onValueChange={(value) => setNewOrder({ ...newOrder, client: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client} className="flex justify-between items-center">
                      {client}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClient(client)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </SelectItem>
                  ))}
                  <SelectItem value="new">Add New Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newOrder.client === "new" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newClient" className="text-right">
                  New Client
                </Label>
                <Input
                  id="newClient"
                  value={newOrder.newClient || ""}
                  onChange={(e) => setNewOrder({ ...newOrder, newClient: e.target.value })}
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="manufacturer" className="text-right">
                Manufacturer
              </Label>
              <Select
                value={newOrder.manufacturer}
                onValueChange={(value) => setNewOrder({ ...newOrder, manufacturer: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((manufacturer) => (
                    <SelectItem key={manufacturer} value={manufacturer} className="flex justify-between items-center">
                      {manufacturer}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteManufacturer(manufacturer)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </SelectItem>
                  ))}
                  <SelectItem value="new">Add New Manufacturer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newOrder.manufacturer === "new" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newManufacturer" className="text-right">
                  New Manufacturer
                </Label>
                <Input
                  id="newManufacturer"
                  value={newOrder.newManufacturer || ""}
                  onChange={(e) => setNewOrder({ ...newOrder, newManufacturer: e.target.value })}
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={() => {
                if ('id' in newOrder && typeof newOrder.id === 'string') {
                  handleEditOrder(newOrder.id, { ...newOrder, id: newOrder.id as string });
                } else {
                  handleAddOrder();
                }
              }} 
              disabled={isAddingOrder}
            >
              {isAddingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                newOrder && 'id' in newOrder ? "Save Changes" : "Save Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}